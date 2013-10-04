//dependancies
var events = require('events');
var util = require('util');
var mimelib = require('mimelib');
var Imap = require('imap');

var findWhere = function(list, properties){
    for (var i = 0; i < list.length; i++){
        var is_match = true;
        for (var key in properties){
            if (list[i][key]!=properties[key]){
                is_match = false;
                break;
            }
        }
        if (is_match){
            return list[i];
        }
    }
    return undefined;
};

var trim_str_by_char = function(str, char){
    for (var start = 0; str[start]==char; start++){}
    for (var end = start; str[end]!=char; end++){}
    return str.substring(start, end);
}
var parse_email = function(text, params){
    var type = params['Content-Type'];
    if (type.split('/')[0]=='multipart'){
        var separator = trim_str_by_char(type.split('=').slice(-1)[0], '"');
        var parts = text.split('--'+separator).slice(1,-1).map(function(part_string){
            part_string = part_string.trim();

            var sep_start = part_string.indexOf('\r\n\r\n');
            var sep_end = sep_start + 4;
            var params_string = part_string.substr(0, sep_start);
            var content_string = part_string.substr(sep_end);

            var params = {};
            var key = null;
            params_string.split('\r\n').forEach(function(line){
                if (line.substr(0, 1)=='\t'){
                    params[key] += ' ' + line.substr(1);
                } else {
                    var parts = line.split(': ');
                    key = parts[0];
                    params[key] = parts[1];
                }
            });

            return parse_email(content_string, params);
        });
        return {
            type: type,
            parts: parts
        };

    } else {
        var content = null;
        switch(params['Content-Transfer-Encoding']){
            case 'quoted-printable': content = mimelib.decodeQuotedPrintable(text); break;
            case '7bit': content = text; break;
            default: content = 'Unsupported Content-Transfer-Encoding "'+params['Content-Transfer-Encoding']+'". Nudge matt_5001@hotmail.com to add this.';
        }
        var disposition = params['Content-Disposition'];
        return {
            type: type,
            content: content,
            disposition: disposition
        };
    }
};
var stream_to_string = function(stream, cb){
    var buffer = '';
    stream.on('data', function(chunk) {
        buffer += chunk.toString('utf8');
    });
    stream.once('end', function() {
        cb(null, buffer);
    });
};
var body_names = ['HEADER'/*.FIELDS (FROM TO SUBJECT DATE CONTENT-TYPE CONTENT-TRANSFER-ENCODING CONTENT-DISPOSITION)'*/, 'TEXT'];
var fetch_email = function(imap, uids, cb){
    var self = this;
    var fetch = imap.fetch(uids, {
        bodies: body_names
    });
    fetch.on('message', function(message){
        var uid = null;
        var header = null;
        var text = null;
        message.on('attributes', function(attributes){
            uid = attributes.uid;
        });
        message.on('body', function(body_stream, body_info) {
            var body_index = body_names.indexOf(body_info.which);
            if (body_index==-1){
                cb(new Error('ImapQuery: Unknown email body "'+body_info.which+'"'));
                return;
            }
            stream_to_string(body_stream, function(error, body_string){
                if (error){
                    cb(error);
                    return;
                }
                switch (body_index){
                    case 0: header = Imap.parseHeader(body_string); break;
                    case 1: text = body_string || -1; break;
                }
            });
        });
        message.on('end', function(){
            if (!uid || !header || !text){
                cb(new Error('ImapQuery: premature end of message'));
                return;
            }

            var params = {};
            ['Content-Type', 'Content-Transfer-Encoding', 'Content-Disposition'].forEach(function(param_key){
                var key = param_key.toLowerCase();
                if (key in header){
                    params[param_key] = header[key][0];
                }
            });

            var body = null;
            try {
                body = parse_email(text, params);
            } catch (error) {
                cb(error);
                return;
            }

            var email_text = null;
            var email_html = null;
            var attachments = [];

            var search_part = function(part){
                if (part.parts){
                    part.parts.forEach(search_part);
                } else {
                    switch(part.type.split('; ')[0]){
                        case 'text/plain':
                            if (!email_text){
                                email_text = part.content;
                            }
                            break;
                        case 'text/html':
                            if (!email_html){
                                email_html = part.content;
                            }
                            break;
                    }
                    if (part.disposition && (part.disposition.split(';')[0]=='attachment')){
                        attachments.push(part);
                    }
                }
            };
            search_part(body);

            cb(null, {
                uid: uid,
                from: header.from[0],
                to: header.to,
                subject: header.subject[0],
                date: header.date[0],
                text: email_text,
                html: email_html,
                attachments: attachments
            });
        });
    });
    fetch.once('error', function(error) {
        cb(error);
    });
    fetch.once('end', function() {
        imap.end();
        cb(null, false);
    });
};



//ImapQuery initializer
var ImapQuery = function(mailbox, criteria){
    var self = this;
    self._account = mailbox;
    self._criteria = criteria;
    self._messages = [];
};
//inheritance
util.inherits(ImapQuery, events.EventEmitter);
//public members
ImapQuery.prototype.messages = function(){
    return this._messages.slice();
};
//private members
ImapQuery.prototype.check = function(_cb){
    var cb = _cb || function(){};
    var self = this;
    var imap = new Imap({
        host: self._account.host,
        port: self._account.port,
        user: self._account.user,
        password: self._account.pass,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });
    var fail = function(error){
        imap.end();
        var callback = cb;
        cb = function(){};
        callback(error);
    };
    imap.once('ready', function(){
        imap.openBox(self._account.box, true, function(error, box){
            if (error){fail(error); return;}
            imap.search(self._criteria, function(error, uids){
                if (error){fail(error); return;}
                var old_messages = self._messages.filter(function(message){
                    return uids.indexOf(message.uid)==-1;
                });
                var new_uids = uids.filter(function(uid){
                    return !findWhere(self._messages, {uid: uid});
                });
                var new_messages = [];
                var done = function(){
                    imap.end();
                    old_messages.forEach(function(message){
                        self._messages.splice(self._messages.indexOf(message), 1);
                        self.emit('delete', message);
                    });
                    new_messages.forEach(function(message){
                        self._messages.push(message);
                        self.emit('add', message);
                    });
                    cb(null, (old_messages.length>0)||(new_messages.length>0));
                };
                if (!new_uids.length){done(); return;}
                fetch_email(imap, new_uids, function(error, message){
                    if (error){fail(error); return;}
                    if (!message){done(); return;}
                    new_messages.push(message);
                });
            });
        });
    });
    imap.once('error', function(error) {
        fail(error);
    });
    imap.connect();
};
module.exports = ImapQuery;

