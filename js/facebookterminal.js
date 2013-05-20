// Generated by CoffeeScript 1.4.0

/*
 Main
*/


(function() {
  var Action, ActionFactory, Client, CommandError, CommentGraphApiAction, CommentsGraphApiAction, FBTUtils, FQLAction, FacebookTerminal, GraphApiAction, HelpAction, HomeGraphApiAction, LikeGraphApiAction, NoAction, Outputter, PermissionAction, PostGraphApiAction, UnlikeGraphApiAction,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  FacebookTerminal = (function() {

    function FacebookTerminal() {}

    FacebookTerminal.version = function() {
      return '1.0.0';
    };

    FacebookTerminal.start = function() {
      var repl;
      try {
        global._us = require("./libs/underscore.js");
        global.FB = require("fb");
        global.FBConnect = new (require("./fbconnect"));
        require("./loginserver.js");
        this.apiclient = new Client();
        repl = require("repl");
        return repl.start({
          prompt: "> ",
          input: process.stdin,
          output: process.stdout,
          "eval": this.evaluate,
          ignoreUndefined: true
        });
      } catch (error) {
        throw error;
      } finally {

      }
    };

    FacebookTerminal.evaluate = function(cmd, context, filename, callback) {
      var value;
      cmd = cmd.substr(1, cmd.length - 3);
      if (cmd === '') {
        return callback(null, void 0, cmd);
      } else {
        value = cmd;
        FacebookTerminal.apiclient.execute(cmd);
        return callback(null, void 0, cmd);
      }
    };

    return FacebookTerminal;

  }).call(this);

  FBTUtils = (function() {

    function FBTUtils() {}

    FBTUtils.parse_query = function(query) {
      var pair, rs, v, vars, _i, _len;
      vars = query.split('&');
      rs = {};
      for (_i = 0, _len = vars.length; _i < _len; _i++) {
        v = vars[_i];
        pair = v.split('=');
        rs[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return rs;
    };

    FBTUtils.get_query = function(url) {
      return url.substr(url.indexOf('?') + 1);
    };

    FBTUtils.get_param_from_url = function(url, key) {
      var _ref;
      return (_ref = this.parse_query(this.get_query(url))) != null ? _ref[key] : void 0;
    };

    return FBTUtils;

  })();

  Outputter = (function() {

    function Outputter() {
      this.indent = __bind(this.indent, this);

      this.output_kv = __bind(this.output_kv, this);

      this.obj_to_output = __bind(this.obj_to_output, this);

      this.prepare = __bind(this.prepare, this);

      this.output = __bind(this.output, this);
      this.buf = [];
    }

    Outputter.prototype.output = function(value) {
      this.prepare(value);
      return this.write();
    };

    Outputter.prototype.write = function() {
      this.rows = 0;
      while (this.buf.length > 0) {
        this.rows++;
        this.write_next();
      }
      if (this.buf.length === 0 && this.has_next()) {
        return console.log("more...(type 'next')");
      }
    };

    Outputter.prototype.write_next = function() {
      return console.log(this.buf.shift());
    };

    Outputter.prototype.has_more = function() {
      return this.buf.length > 0;
    };

    Outputter.prototype.has_next = function() {
      return !!this.paging_next;
    };

    Outputter.prototype.prepare = function(value) {
      var code, error, permission, _ref, _ref1;
      if (value === null || value === void 0) {
        return;
      }
      if (value.error != null) {
        this.obj_to_output(value);
        error = value.error;
        code = error.code;
        if (code === 10 || (code >= 200 && code <= 299)) {
          permission = _us.last(error.message.split(' '));
          this.store("Grant me the permission! Type 'permission \#{permission}'");
        }
      } else if (_us.isArray(value.data) && value.data.length === 0) {
        this.store('No result. (Is that strange? If so, check the permissions.)');
      } else if (_us.isObject(value)) {
        this.obj_to_output(value);
      } else {
        this.store(value);
      }
      if (value != null ? (_ref = value.paging) != null ? _ref.next : void 0 : void 0) {
        return this.paging_next = value != null ? (_ref1 = value.paging) != null ? _ref1.next : void 0 : void 0;
      }
    };

    Outputter.prototype.obj_to_output = function(obj, i) {
      var k, v, _results;
      if (i === void 0) {
        i = 0;
      }
      _results = [];
      for (k in obj) {
        v = obj[k];
        _results.push(this.output_kv(k, v, i));
      }
      return _results;
    };

    Outputter.prototype.output_kv = function(k, v, i) {
      if (_us.isObject(v)) {
        this.store("" + (this.indent(i)) + k + ":");
        return this.obj_to_output(v, 1 + i);
      } else {
        return this.store("" + (this.indent(i)) + k + ": " + v);
      }
    };

    Outputter.prototype.indent = function(i) {
      var j, rs, _i;
      rs = '';
      for (j = _i = 0; 0 <= i ? _i <= i : _i >= i; j = 0 <= i ? ++_i : --_i) {
        rs += '- ';
      }
      return rs;
    };

    Outputter.prototype.store = function(v) {
      var t, _i, _len, _ref, _results;
      _ref = v.toString().split('\n');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        t = _ref[_i];
        _results.push(this.buf.push(t));
      }
      return _results;
    };

    return Outputter;

  })();

  Client = (function() {

    function Client() {
      this.cb = __bind(this.cb, this);
      this.history_ids = [];
      this.command_histories = [];
      this.pre_result = null;
      this.re = new RegExp("#[0-9]+");
    }

    Client.prototype.is_login = function(cb) {
      return FBConnect.is_login(cb);
    };

    Client.prototype.execute = function(cmd) {
      var _ref, _ref1,
        _this = this;
      this.command_histories.push(cmd);
      if (cmd === 'next') {
        if ((_ref = this.outputter) != null ? _ref.has_more() : void 0) {
          this.outputter.write();
        } else if ((_ref1 = this.outputter) != null ? _ref1.has_next() : void 0) {
          this.action.next(this.cb);
        } else {
          console.log('no more');
        }
        return;
      }
      return this.is_login(function(b) {
        if (b) {
          try {
            cmd = _this.set_ids(cmd);
            _this.action = ActionFactory.get_instance(cmd);
            return _this.action.execute(_this.cb);
          } catch (error) {
            if (error instanceof CommandError) {
              return console.log('command error');
            } else {
              throw error;
            }
          }
        } else {
          switch (cmd) {
            case "login":
              return FBConnect.login(_this.cb);
            default:
              return FBConnect.instruct_login(_this.cb);
          }
        }
      });
    };

    Client.prototype.set_ids = function(cmd) {
      return this.replace_id(cmd);
    };

    Client.prototype.replace_id = function(cmd) {
      var mid, tmp;
      if (this.re.test(cmd)) {
        mid = RegExp.lastMatch;
        tmp = parseInt(RegExp.lastMatch.substr(1), 10);
        if (this.history_ids[tmp]) {
          mid = this.history_ids[tmp];
        }
        return RegExp.leftContext + mid + this.replace_id(RegExp.rightContext);
      } else {
        return cmd;
      }
    };

    Client.prototype.cb = function(rs) {
      this.pre_result = rs;
      this.outputter = new Outputter();
      this.save_ids(rs);
      return this.outputter.output(rs);
    };

    Client.prototype.save_ids = function(rs) {
      var v, _i, _len, _ref, _results;
      if (this.is_list_data(rs) && rs.data.length > 0 && (rs.data[0].id != null)) {
        this.history_ids = [];
        _ref = rs.data;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          _results.push(this.history_ids.push(v.id));
        }
        return _results;
      }
    };

    Client.prototype.is_list_data = function(rs) {
      return _us.isObject(rs) && _us.isArray(rs.data);
    };

    return Client;

  })();

  ActionFactory = (function() {

    function ActionFactory() {}

    ActionFactory.get_instance = function(cmd) {
      var vs;
      vs = cmd.split(' ');
      vs = _us.filter(vs, function(v) {
        return v.length > 0;
      });
      if (vs[0] === 'api') {
        return new GraphApiAction(vs.slice(1));
      } else if (vs[0].match(/^\d+_?\d+$/)) {
        return new GraphApiAction(vs);
      } else if (vs[0] === 'fql') {
        return new FQLAction(cmd);
      } else if (vs[0] === 'like') {
        return new LikeGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'unlike') {
        return new UnlikeGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'home') {
        return new HomeGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'post') {
        return new PostGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'comment') {
        return new CommentGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'comments') {
        return new CommentsGraphApiAction(vs.slice(1));
      } else if (vs[0] === 'permission') {
        return new PermissionAction(vs);
      } else if (vs[0] === 'login') {
        return new NoAction();
      } else if (vs[0] === 'help') {
        return new HelpAction();
      }
      console.log("" + cmd + ": command not found");
      return new NoAction();
    };

    ActionFactory.is_number_string = function(value) {
      return _us.every(value.split(''), function(v) {
        return _us.contains([], v);
      });
    };

    return ActionFactory;

  })();

  CommandError = (function() {

    function CommandError() {}

    return CommandError;

  })();

  Action = (function() {

    function Action() {}

    Action.prototype.next = function() {
      var utl, _ref, _ref1;
      if (((_ref = this.res) != null ? (_ref1 = _ref.paging) != null ? _ref1.next : void 0 : void 0) != null) {
        utl = FBTUtils.get_param_from_url(this.res.paging.next, 'until');
        this.fields['until'] = utl;
        return this.execute(this.cb);
      } else {
        return console.log('no more');
      }
    };

    return Action;

  })();

  NoAction = (function(_super) {

    __extends(NoAction, _super);

    function NoAction(cmd) {
      this.cmd = cmd;
    }

    NoAction.prototype.execute = function(cb) {
      return cb(void 0);
    };

    return NoAction;

  })(Action);

  GraphApiAction = (function(_super) {

    __extends(GraphApiAction, _super);

    function GraphApiAction(values) {
      var tmp;
      if (values.length === 0) {
        throw new CommandError();
      }
      this.api = values.shift();
      this.method = 'get';
      this.fields = {};
      this.has_fieds = false;
      if (values.length > 0) {
        tmp = values[0];
        if (tmp.toLowerCase() === 'post' || tmp.toLowerCase() === 'delete') {
          this.method = tmp.toLowerCase();
          values.shift();
        }
      }
      if (values.length > 0) {
        tmp = values.shift();
        this.fields = FBTUtils.parse_query(tmp);
        if (_us.keys(this.fields).length > 0) {
          this.has_fieds = true;
        }
      }
    }

    GraphApiAction.prototype.execute = function(cb) {
      var _this = this;
      this.cb = cb;
      return FB.api(this.api, this.method, this.fields, function(res) {
        var _ref;
        if ((res != null ? (_ref = res.paging) != null ? _ref.next : void 0 : void 0) != null) {
          _this.res = res;
        }
        res = _this.filter(res);
        return _this.cb(res);
      });
    };

    GraphApiAction.prototype.filter = function(res) {
      return res;
    };

    GraphApiAction.prototype.next = function() {
      var utl, _ref, _ref1;
      if (((_ref = this.res) != null ? (_ref1 = _ref.paging) != null ? _ref1.next : void 0 : void 0) != null) {
        utl = FBTUtils.get_param_from_url(this.res.paging.next, 'until');
        this.fields['until'] = utl;
        return this.execute(this.cb);
      } else {
        return console.log('no more');
      }
    };

    return GraphApiAction;

  })(Action);

  LikeGraphApiAction = (function(_super) {

    __extends(LikeGraphApiAction, _super);

    function LikeGraphApiAction(values) {
      if (values.length === 0) {
        throw new CommandError();
      }
      this.api = "" + values[0] + "/likes";
      this.method = 'post';
      this.fields = {};
      this.has_fieds = false;
    }

    return LikeGraphApiAction;

  })(GraphApiAction);

  UnlikeGraphApiAction = (function(_super) {

    __extends(UnlikeGraphApiAction, _super);

    function UnlikeGraphApiAction(values) {
      if (values.length === 0) {
        throw new CommandError();
      }
      this.api = "" + values[0] + "/likes";
      this.method = 'delete';
      this.fields = {};
      this.has_fieds = false;
    }

    return UnlikeGraphApiAction;

  })(GraphApiAction);

  HomeGraphApiAction = (function(_super) {

    __extends(HomeGraphApiAction, _super);

    function HomeGraphApiAction(values) {
      this.filter = __bind(this.filter, this);
      this.api = "me/home";
      this.method = 'get';
      this.fields = {};
      this.has_fieds = false;
    }

    HomeGraphApiAction.prototype.filter = function(obj) {
      var k, properties, v;
      properties = ['privacy', 'type', 'story_tags', 'icon', 'actions', 'status_type', 'with_tags', 'message_tags', 'application', 'properties', 'namespace', 'created_time', 'object_id'];
      for (k in obj) {
        v = obj[k];
        if (_us.contains(properties, k)) {
          delete obj[k];
        } else if (k === 'likes' || k === 'comments' || k === 'shares') {
          obj[k] = v.count;
        } else if (k === 'from') {
          obj[k] = "" + v.id + ": " + v.name;
          if (v.category != null) {
            obj[k] += v.category;
          }
        } else {
          if (_us.isObject(v)) {
            this.filter(v);
          }
        }
      }
      return obj;
    };

    return HomeGraphApiAction;

  })(GraphApiAction);

  CommentGraphApiAction = (function(_super) {

    __extends(CommentGraphApiAction, _super);

    function CommentGraphApiAction(values) {
      if (values.length !== 2) {
        throw new CommandError();
      }
      this.api = "" + values[0] + "/comments";
      this.method = 'post';
      this.fields = {
        message: values[1]
      };
      this.has_fieds = true;
    }

    return CommentGraphApiAction;

  })(GraphApiAction);

  CommentsGraphApiAction = (function(_super) {

    __extends(CommentsGraphApiAction, _super);

    function CommentsGraphApiAction(values) {
      if (values.length !== 1) {
        throw new CommandError();
      }
      this.api = "" + values[0] + "/comments";
      this.method = 'get';
    }

    return CommentsGraphApiAction;

  })(GraphApiAction);

  PostGraphApiAction = (function(_super) {

    __extends(PostGraphApiAction, _super);

    function PostGraphApiAction(values) {
      if (values.length !== 1) {
        throw new CommandError();
      }
      this.api = "me/feed";
      this.method = 'post';
      this.fields = {
        message: values[0]
      };
      this.has_fieds = true;
    }

    return PostGraphApiAction;

  })(GraphApiAction);

  FQLAction = (function(_super) {

    __extends(FQLAction, _super);

    function FQLAction(value) {
      var idx;
      idx = value.indexOf('fql');
      value = value.substr(idx + 4);
      if (!(value.length > 0)) {
        throw new CommandError();
      }
      this.query = value;
      console.log(this.query);
    }

    FQLAction.prototype.execute = function(cb) {
      var _this = this;
      this.cb = cb;
      return FB.api("fql", {
        q: "" + this.query
      }, function(res) {
        _this.res = res;
        return _this.cb(res);
      });
    };

    return FQLAction;

  })(Action);

  PermissionAction = (function(_super) {

    __extends(PermissionAction, _super);

    function PermissionAction(vs) {
      var _ref;
      this.scope = vs.slice(1);
      if (!(((_ref = this.scope) != null ? _ref.length : void 0) > 0)) {
        throw new CommandError();
      }
    }

    PermissionAction.prototype.execute = function(cb) {
      this.cb = cb;
      return FBConnect.permission(this.scope, this.cb);
    };

    return PermissionAction;

  })(Action);

  HelpAction = (function(_super) {

    __extends(HelpAction, _super);

    function HelpAction() {}

    HelpAction.prototype.execute = function(cb) {
      this.cb = cb;
      console.log("#");
      console.log("# Essential commands");
      console.log("#");
      console.log("home: get your feed. (synonym for 'api me/home')");
      console.log("\#{object_id}: get the object.");
      console.log("post \#{your message}: post your message. (synonym for 'api me/feed post \#{your message}')");
      console.log("like \#{object_id}: like the object. (synonym for 'api \#{object_id}/likes post')");
      console.log("unlike \#{object_id}: unlike the object. (synonym for 'api \#{object_id}/likes delete')");
      console.log("comments \#{object_id}: get the comments of the object. (synonym for 'api \#{object_id}/comments')");
      console.log("comment \#{object_id} \#{your comment}: post the comment to the object. (synonym for 'api \#{object_id}/comments post message=\#{your comment}')");
      console.log("#");
      console.log("# Low order commands");
      console.log("#");
      console.log("api \#{object} [method] [params]: execute the facebook api.");
      console.log("fql \#{fql}: execute the FQL.");
      console.log("#");
      console.log("# you can use the index in the result list of the previous command instead of the object_id.");
      console.log("# For more details, go to https://github.com/kissrobber/facebook_client_terminal");
      console.log("#");
      return this.cb();
    };

    return HelpAction;

  })(Action);

  module.exports = FacebookTerminal;

}).call(this);
