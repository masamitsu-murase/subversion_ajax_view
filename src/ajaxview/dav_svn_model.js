
var DavSvnResource = function(name, type, info){
    this.m_type = type;
    switch(type){
      case DavSvnResource.TYPE_DIRECTORY:
        this.m_dir_state = DavSvnResource.DIR_CLOSED;
        break;
      default:
        break;
    }
    this.m_state = DavSvnResource.STATE_NOT_LOADED;
    this.m_name = name;
    this.m_children = {};
    this.m_parent = null;
    this.m_info = (info || {});
};
DavSvnResource.prototype = {
    type: function(){ return this.m_type; },
    name: function(decode /* = false */){
        if (decode){
            return decodeURIComponent(this.m_name);
        }else{
            return this.m_name;
        }
    },
    state: function(){ return this.m_state; },
    setState: function(state){ this.m_state = state; },

    dirIsOpened: function(){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "dirIsOpened error";
        }
        return this.m_dir_state == DavSvnResource.DIR_OPENED;
    },
    dirIsClosed: function(){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "dirIsClosed error";
        }
        return this.m_dir_state == DavSvnResource.DIR_CLOSED;
    },
    setDirState: function(state){
        if (this.m_type != DavSvnResource.TYPE_DIRECTORY){
            throw "setDirState error";
        }
        var changed = (this.m_dir_state != state);
        this.m_dir_state = state;
        return changed;
    },
    dirOpen: function(){
        return this.setDirState(DavSvnResource.DIR_OPENED);
    },
    dirClose: function(){
        return this.setDirState(DavSvnResource.DIR_CLOSED);
    },

    isRoot: function(){
        return (this.name() === "" && this.isDirectory());
    },
    isDirectory: function(){
        return this.type() == DavSvnResource.TYPE_DIRECTORY;
    },
    isFile: function(){
        return this.type() == DavSvnResource.TYPE_FILE;
    },
    isUnknown: function(){
        return this.type() == DavSvnResource.TYPE_UNKNOWN;
    },

    addChild: function(child){
        var name = child.name();
        this.m_children[name] = child;
        child.setParent(this);
    },
    children: function(){
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        return keys.map(function(k){ return this.m_children[k]; }, this);
    },
    childDirs: function(){
        return this.children().filter(function(child){ return child.isDirectory(); });
    },
    childFiles: function(){
        return this.children().filter(function(child){ return child.isFile(); });
    },
    hasChild: function(name){
        return this.m_children[name] != null;
    },
    findChild: function(name){
        return this.m_children[name];
    },
    parent: function(){ return this.m_parent; },
    setParent: function(parent){
        this.m_parent = parent;
    },

    path: function(decode /* = false */){
        var path = this.name(decode);
        var resource = this.parent();
        while(resource && !(resource.isRoot())){
            path = resource.name(decode) + "/" + path;
            resource = resource.parent();
        }
        return path;
    },

    contentUrl: function(){
        return this.m_info.content_url;
    },

    markNotLoaded: function(){
        this.m_children = {};
        this.m_state = DavSvnResource.STATE_NOT_LOADED;
    },
    markLoading: function(){
        this.m_children = {};
        this.m_state = DavSvnResource.STATE_LOADING;
    },
    markLoaded: function(){
        this.m_state = DavSvnResource.STATE_LOADED;
    },
    isLoaded: function(){
        return this.m_state == DavSvnResource.STATE_LOADED;
    },
    isLoading: function(){
        return this.m_state == DavSvnResource.STATE_LOADING;
    },

    info: function(attr){
        if (attr){
            return this.m_info[attr];
        }else{
            return this.m_info;
        }
    },

    debugInfo: function(level){
        level = (level || 0);
        var space = "";
        for (var i=0; i<level; i++){
            space += "    ";
        }
        var str = space + this.name() + ": " + (this.type()==DavSvnResource.TYPE_FILE ? "file" : "dir");
        var keys = [];
        for (var k in this.m_children){
            keys.push(k);
        }
        keys.sort();
        str += "\n" + keys.map(function(k){ return this.m_children[k].debugInfo(level + 1); }, this).join("\n");
        return str;
    }
};
DavSvnResource.TYPE_UNKNOWN = 1;
DavSvnResource.TYPE_FILE = 2;
DavSvnResource.TYPE_DIRECTORY = 3;
DavSvnResource.DIR_OPENED = 1;
DavSvnResource.DIR_CLOSED = 2;
DavSvnResource.STATE_LOADING = 1;
DavSvnResource.STATE_LOADED = 2;
DavSvnResource.STATE_NOT_LOADED = 3;


var DavSvnModel = function(url, revision, pjax_state){
    url = url.replace(/\/$/, "");

    this.m_peg_revision = (revision || "HEAD");
    this.m_operation_revision = (revision || "HEAD");
    this.m_root_url = null;
    this.m_current_path = null;
    this.m_listeners = [];
    this.m_root_dir = null;

    this.m_pjax_state = null;
    if (pjax_state){
        this.m_pjax_state = new DavSvnPjaxState(this);
    }

    // initialize
    var self = this;
    gDavSvn.rootUrl(url, function(obj){
        if (!(obj.ret)){
            return;
        }

        self.m_root_url = obj.root_url;
        self.m_uuid = obj.uuid;
        self.m_current_path = obj.path;
        self.reloadPath(obj.path);
    });
};
DavSvnModel.prototype = {
    // Add event listener.
    // @public@
    addListener: function(listener){
        this.m_listeners.push(listener);
    },
    // Remove event listener.
    // @public@
    removeListener: function(listener){
        this.m_listeners = this.m_listeners.filter(function(i){ return i != listener; });
    },
    // Notify state change synchronously.
    // @public@
    notify: function(){
        this.m_listeners.forEach(function(listener){
            listener.update();
        });
    },

    // Return peg revision.
    // @public@
    pegRevision: function(){ return this.m_peg_revision; },
    // Return operation revision.
    // @public@
    operationRevision: function(){ return this.m_operation_revision; },

    // Return repository informatoin.
    // @public@
    repositoryInfo: function(){
        return {
            uuid: this.m_uuid,
            root_url: this.m_root_url
        };
    },

    // Create new DavSvnResource.
    // @private@
    createDavSvnResource: function(resource_info){
        var info = {
            author: resource_info.author,
            revision: resource_info.revision,
            date: resource_info.date,
            size: resource_info.size,
            content_url: resource_info.href
        };
        return new DavSvnResource(resource_info.path.split("/").pop(),
                                  (resource_info.type == "file" ? DavSvnResource.TYPE_FILE
                                   : DavSvnResource.TYPE_DIRECTORY),
                                  info);
    },
    // Reload specified path.
    // Directory state of "path" (opened/closed) is kept.
    // @public@
    reloadPath: function(path){
        var self = this;

        // First, replace current resource.
        var target = this.resource(path);
        if (!target){
            if (path === ""){
                target = new DavSvnResource("", DavSvnResource.TYPE_DIRECTORY);
                target.dirOpen();
            }else{
                target = new DavSvnResource(path.split("/").pop(), DavSvnResource.TYPE_UNKNOWN);
            }
            this.setResource(path, target);
        }
        target.markLoading();
        this.notify();

        // Then, reload current resource and children.
        gDavSvn.fileList(this.m_root_url + path, this.m_peg_revision, function(obj){
            if (!(obj.ret)){
                target.markNotLoaded();
                self.notify();
                return;
            }

            // add files
            var target_resource = self.createDavSvnResource(obj.file_list.shift());
            obj.file_list.forEach(function(file){
                var child = self.createDavSvnResource(file);
                target_resource.addChild(child);
            });
            target_resource.markLoaded();

            // Replace old resource with new one.
            self.setResource(path, target_resource);

            if (target.isDirectory() && target_resource.isDirectory()){
                if (target.dirIsOpened()){
                    target_resource.dirOpen();
                }else{
                    target_resource.dirClose();
                }
            }else if (target.isUnknown() && target_resource.isDirectory()){
                // first loading
                target_resource.dirOpen();
            }
            self.notify();
        });
    },
    // Push states
    pushState: function(){
        if (this.m_pjax_state){
            this.m_pjax_state.pushState({ path: this.path(), revision: this.pegRevision() });
        }
    },
    // Change current path.
    // @public@
    changePath: function(path, do_not_push_state){
        if (this.m_current_path != path){
            this.m_current_path = path;
            if (!do_not_push_state){
                this.pushState();
            }
            this.notify();
        }
    },
    // Return current path.
    // @public@
    path: function(){
        return this.m_current_path;
    },
    // Return current path.
    // This is an alias of 'path' method.
    // @public@
    currentPath: function(){
        return this.path();
    },

    // Directory operation

    // Open directory.
    // @public@
    openDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }
        var changed = resource.dirOpen();
        if (changed && !no_notify){
            this.notify();
        }
    },
    // Close directory.
    // @public@
    closeDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }
        var changed = resource.dirClose();
        if (changed && !no_notify){
            this.notify();
        }
    },
    // Toggle directory open/closed state.
    // @public@
    toggleDirectory: function(path, no_notify){
        var resource = this.resource(path);
        if (!resource || !resource.isDirectory()){
            return;
        }

        if (resource.dirIsOpened()){
            this.closeDirectory(path, no_notify);
        }else{
            this.openDirectory(path, no_notify);
        }
    },

    // clear all resource
    // @private@
    clearAllResources: function(){
        if (!this.m_root_dir){
            return;
        }

        this.m_root_dir = null;
    },

    // Set new resource.
    // This method should be called in changePath
    // @private@
    setResource: function(path, resource){
        if (path === ""){
            this.m_root_dir = resource;
            return;
        }

        this.m_root_dir = (this.m_root_dir || new DavSvnResource("", DavSvnResource.TYPE_DIRECTORY));

        var dir = this.m_root_dir;
        var paths = path.split("/");
        paths.pop();
        paths.forEach(function(name){
            if (dir.hasChild(name)){
                dir = dir.findChild(name);
            }else{
                var new_dir = new DavSvnResource(name, DavSvnResource.TYPE_DIRECTORY);
                dir.addChild(new_dir);
                dir.dirOpen();
                dir = new_dir;
            }
        });
        dir.addChild(resource);
        dir.dirOpen();
    },
    // @public@
    resource: function(path){
        if (!this.m_root_dir){
            // Not initialized yet.
            return null;
        }

        if (path === "" || !path){
            // this means root.
            return this.m_root_dir;
        }

        var paths = path.split("/");
        var dir = this.m_root_dir;
        for (var i=0; i<paths.length; i++){
            var name = paths[i];
            if (dir.hasChild(name)){
                dir = dir.findChild(name);
            }else{
                return null;
            }
        }
        return dir;
    },

    // Change revision.
    // Currently, peg revision and operation revision must be same.
    // @public@
    setRevision: function(revision, do_not_push_state){
        if (this.m_peg_revision != revision || this.m_operation_revision != revision){
            this.m_peg_revision = revision;
            this.m_operation_revision = revision;

            if (!do_not_push_state){
                this.pushState();
            }
            this.clearAllResources();
            this.reloadPath(this.currentPath());
        }
    }
};


/////////////////////////////////////////////////////////////////
var DavSvnPjaxState = function(model){
    this.m_model = model;

    var self = this;
    window.addEventListener("popstate", function(event){
        var url = location.href;
        var obj = DavSvnPjaxState.decodeUrl(self.m_model.repositoryInfo().root_url, url);

        var dir = self.m_model.resource(obj.path);
        self.m_model.changePath(obj.path, true);
        if (!dir || !dir.isLoaded()){
            self.m_model.reloadPath(obj.path);
        }
        self.m_model.setRevision(obj.revision, true);

        var title = obj.path + "@" + obj.revision;
        DavSvnPjaxState.setPageTitle(title);
    });
};
DavSvnPjaxState.prototype = {
    pushState: function(state){
        var title = state.path + "@" + state.revision;
        DavSvnPjaxState.setPageTitle(title);
        window.history.pushState(state, title, DavSvnPjaxState.encodeUrl(this.m_model.repositoryInfo().root_url,
                                                                         state.path, state.revision));
    }
};
DavSvnPjaxState.setPageTitle = function(title){
    try{
        var head = document.getElementsByTagName("head")[0];
        var t = head.getElementsByTagName("title")[0];
        while(t.firstChild){
            t.removeChild(t.firstChild);
        }
        t.appendChild(document.createTextNode(title));
    }catch(e){
    }
};
DavSvnPjaxState.encodeUrl = function(root_url, path, revision){
    if (revision == "HEAD"){
        return root_url + path + "?" + "ajaxview";
    }else{
        return root_url + path + "?" + "ajaxview&p=" + revision;
    }
};
DavSvnPjaxState.decodeUrl = function(root_url, url){
    var obj = DavSvnPjaxState.parseUrl(url);
    var ret = {
        path: obj.url.substr(root_url.length).replace(/\/$/, ""),
        revision: "HEAD"
    };
    if (obj.params["p"]){
        if (obj.params["p"] != "HEAD"){
            ret.revision = parseInt(obj.params["p"]);
        }
    }
    return ret;
};
DavSvnPjaxState.parseUrl = function(raw_url){
    var sep = raw_url.indexOf("?");
    if (sep < 0){
        return {
            url: raw_url,
            params: {}
        };
    }

    var url = raw_url.substr(0, sep);
    var params = {};
    raw_url.substr(sep + 1).split("&").forEach(function(item){
        var idx = item.indexOf("=");
        if (idx < 0){
            params[item] = true;
        }else{
            params[item.substr(0, idx)] = item.substr(idx + 1);
        }
    });

    return {
        url: url,
        params: params
    };
};


/////////////////////////////////////////////////////////////////
var DavSvnLogModel = function(url, peg_revision){
    this.m_url = url.replace(/\/$/, "");
    this.m_peg_revision = peg_revision;
    this.m_log_complete = false;
    this.m_state = DavSvnLogModel.STATE_LOADED;
    this.m_logs = [];

    this.m_listeners = [];
};
DavSvnLogModel.prototype = {
    // Add event listener.
    // @public@
    addListener: function(listener){
        this.m_listeners.push(listener);
    },
    // Remove event listener.
    // @public@
    removeListener: function(listener){
        this.m_listeners = this.m_listeners.filter(function(i){ return i != listener; });
    },
    // Notify state change synchronously.
    // @public@
    notify: function(){
        this.m_listeners.forEach(function(listener){
            listener.update();
        });
    },

    // Return whether whole logs are loaded or not.
    // @public@
    hasMoreLogs: function(){
        return !(this.m_log_complete);
    },

    // Return logs.
    // @public@
    logs: function(){
        return this.m_logs;
    },

    // Iterate logs.
    // @public@
    eachLog: function(callback, self){
        this.m_logs.forEach(callback, self);
    },

    // set loading
    // @private@
    markLoading: function(){
        this.m_state = DavSvnLogModel.STATE_LOADING;
    },

    // set loaded
    // @private@
    markLoaded: function(){
        this.m_state = DavSvnLogModel.STATE_LOADED;
    },

    // @public@
    isLoading: function(){
        return this.m_state == DavSvnLogModel.STATE_LOADING;
    },

    // @public@
    isLoaded: function(){
        return this.m_state == DavSvnLogModel.STATE_LOADED;
    },


    // Load Subversion logs.
    // @public@
    loadInitialLogs: function(count /* = DavSvnLogModel.INITIAL_LOG_COUNT */){
        if (this.isLoading()){
            return;
        }

        var self = this;
        self.markLoading();
        self.m_log_complete = false;
        count = (count || DavSvnLogModel.INITIAL_LOG_COUNT);
        gDavSvn.log(this.m_url, this.m_peg_revision, this.m_peg_revision, 0, count, function(obj){
            if (!obj.ret){
                self.markLoaded();
                self.m_logs = [];
                self.notify();
                return;
            }

            self.markLoaded();
            self.m_logs = obj.logs;
            self.m_log_complete = (obj.logs.length < count);
            self.notify();
            return;
        });
        this.notify();
    },

    loadMoreLogs: function(count /* = DavSvnLogModel.INITIAL_LOG_COUNT */){
        if (this.isLoading() || !this.hasMoreLogs()){
            return;
        }

        count = (count || DavSvnLogModel.INITIAL_LOG_COUNT);
        if (this.m_logs.length == 0){
            this.loadInitialLogs(count);
            return;
        }

        var revision = this.m_logs[this.m_logs.length - 1].revision;

        var self = this;
        self.markLoading();
        // "count + 1" is Fail safe.
        gDavSvn.log(this.m_url, this.m_peg_revision, revision, 0, count + 1, function(obj){
            if (!obj.ret){
                self.markLoaded();
                self.notify();
                return;
            }

            self.markLoaded();
            if (obj.logs.length < count + 1){
                self.m_log_complete = true;
            }
            obj.logs.shift();  // remove duplicated log.
            self.m_logs = self.m_logs.concat(obj.logs);
            self.notify();
        });
        this.notify();
    },

    // Reload Subversion logs. Logs are force-reloaded.
    // @public@
    reloadLogs: function(){
        if (this.m_logs.length == 0){
            this.loadInitialLogs();
            return;
        }

        var revision = this.m_logs[0].revision;
        var count = this.m_logs.length;

        var self = this;
        self.markLoading();
        gDavSvn.log(this.m_url, this.m_peg_revision, revision, count, function(obj){
            if (!obj.ret){
                self.markLoaded();
                self.notify();
                return;
            }

            self.markLoaded();
            self.m_logs = obj.logs;
            self.notify();
        });
        this.notify();
    },

    url: function(){
        return decodeURIComponent(this.m_url);
    }
};
DavSvnLogModel.INITIAL_LOG_COUNT = 100;
DavSvnLogModel.STATE_LOADED = 1;
DavSvnLogModel.STATE_LOADING = 2;

