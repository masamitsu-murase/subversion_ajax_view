
$(function(){
    var i18n = {
        translator: function(table){
            var default_lang = "en";

            // Argument check
            if (!table[default_lang]){
                throw "Bug: translator.";
            }

            // Default language must have all words.
            var default_lang_keys = [];
            for (var k in table[default_lang]){
                default_lang_keys.push(k);
            }
            for (var l in table){
                if (l == default_lang){
                    continue;
                }
                for (var k in table[l]){
                    if (default_lang_keys.indexOf(k) < 0){
                        throw "Bug: " + k + " is not included in " + default_lang;
                    }
                }
            }

            return function(text, lang){
                lang = (lang || navigator.language);
                var lang_table = (table[lang] || table[default_lang]);
                return lang_table[text];
            };
        },

        date: function(date, format){
            var rjust = function(num, width){
                var str = "" + num;
                if (str.length < width){
                    for (var i=0, len=width-str.length; i<len; i++){
                        str = "0" + str;
                    }
                }
                return str;
            };

            switch(navigator.language){
            case "ja":
                switch(format){
                case i18n.DATE_DATE_ONLY:
                    return rjust(date.getFullYear(), 4)
                        + "/" + rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2);
                case i18n.DATE_TIME_ONLY:
                    return rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                case i18n.DATE_DATE_TIME:
                default:
                    return rjust(date.getFullYear(), 4)
                        + "/" + rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + " " + rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                }
                break;
            case "en":
            default:
                switch(format){
                case i18n.DATE_DATE_ONLY:
                    return rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + "/" + rjust(date.getFullYear(), 4);
                case i18n.DATE_TIME_ONLY:
                    return rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                case i18n.DATE_DATE_TIME:
                default:
                    return rjust(date.getMonth() + 1, 2)
                        + "/" + rjust(date.getDate(), 2)
                        + "/" + rjust(date.getFullYear(), 4)
                        + " " + rjust(date.getHours(), 2)
                        + ":" + rjust(date.getMinutes(), 2)
                        + ":" + rjust(date.getSeconds(), 2);
                }
                break;
            }
        },
        DATE_DATE_ONLY: 1,
        DATE_TIME_ONLY: 2,
        DATE_DATE_TIME: 3
    };

    var PathView = function(view_elem, model, log_view){
        this.m_view_elem = view_elem;
        this.m_model = model;
        this.m_log_view = log_view;

        this.m_path = null;
    };
    PathView.prototype = {
        update: function(){
            var path = this.m_model.path();
            if (this.m_path !== path){
                var rsc = this.m_model.resource(path);
                if (!rsc){
                    return;
                }

                this.m_path = path;

                this.createElement(rsc);
            }
        },
        createElement: function(rsc){
            while(this.m_view_elem.firstChild){
                this.m_view_elem.removeChild(this.m_view_elem.firstChild);
            }

            var span = document.createElement("span");
            this.m_view_elem.appendChild(span);

            var paths = [];
            while(!rsc.isRoot()){
                paths.unshift({ name: rsc.name(true), path: rsc.path() });
                rsc = rsc.parent();
            }

            var root_url = this.m_model.repositoryInfo().root_url;
            paths.unshift({ name: PathView.i18n("root"), path: rsc.path() });

            var self = this;
            paths.forEach(function(item, index){
                if (index != 0){
                    span.appendChild(document.createTextNode("/"));
                }

                var elem = document.createElement("span");
                span.appendChild(elem);
                elem.appendChild(document.createTextNode(item.name));
                $(elem).click(function(){
                    var dir = self.m_model.resource(item.path);
                    if (dir && dir.isLoaded()){
                        self.m_model.changePath(item.path);
                        if (self.m_log_view){
                            self.m_log_view.change(root_url + item.path, self.m_model.pegRevision());
                        }
                    }else{
                        self.m_model.changePath(item.path);
                        self.m_model.reloadPath(item.path);
                        if (self.m_log_view){
                            self.m_log_view.change(root_url + item.path, self.m_model.pegRevision());
                        }
                    }
                });
            });
        }
    };
    PathView.i18n = i18n.translator({
        en: {
            root: "(root)"
        }
    });

    var DirectoryView = function(view_elem, model, log_view){
        this.m_view_elem = view_elem;
        this.m_model = model;
        this.m_log_view = log_view;

        this.m_root_div = this.createRootDiv();
        this.m_view_elem.appendChild(this.m_root_div);
    };
    DirectoryView.prototype = {
        update: function(){
            this.updateTreeView();
        },

        updateTreeView: function(){
            var root_div = this.m_root_div;

            // remove current children
            while(root_div.firstChild){
                root_div.removeChild(root_div.firstChild);
            }

            // append new child
            var dir = this.m_model.resource("");
            this.createResourceNode(root_div, dir);
        },

        createRootDiv: function(){
            var elem = document.createElement("div");
            elem.className = DirectoryView.CLASS_ROOT_DIV;
            return elem;
        },

        appendDirectoryNodeTitle: function(parent, dir){
            var self = this;

            var dir_path = dir.path();
            var class_name = "ui-state-default";
            switch(dir.state()){
            case DavSvnResource.STATE_NOT_LOADED:
                class_name += " not_loaded";
                break;
            case DavSvnResource.STATE_LOADING:
                class_name += " loading";
                break;
            case DavSvnResource.STATE_LOADED:
                class_name += " loaded";
                break;
            }
            class_name += " " + (dir.dirIsOpened() ? "dir_opened" : "dir_closed");
            if (dir_path == this.m_model.path()){
                class_name += " ui-state-highlight";
            }
            $(parent).addClass(class_name);

            var title = document.createElement("span");
            parent.appendChild(title);

            // Collapse button
            var toggle_button = document.createElement("span");
            title.appendChild(toggle_button);
            class_name = DirectoryView.CLASS_COLLAPSE_BUTTON + " ui-icon ui-icon-inline-block";
            if (dir.dirIsOpened()){
                class_name += " ui-icon-triangle-1-se";
            }else{
                class_name += " ui-icon-triangle-1-e";
            }
            $(toggle_button).addClass(class_name);
            $(toggle_button).click(function(){
                var dir = self.m_model.resource(dir_path);
                if (dir && dir.isLoaded()){
                    self.m_model.toggleDirectory(dir_path);
                }else{
                    self.m_model.reloadPath(dir_path);
                    self.m_model.openDirectory(dir_path);
                }
            });
            $(toggle_button).hover(function(){
                $(parent).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(parent).removeClass("ui-state-hover").addClass("ui-state-default");
            });

            // Directory/Loading icon
            var dir_icon = document.createElement("span");
            title.appendChild(dir_icon);
            class_name = "ui-icon ui-icon-inline-block";
            if (dir.isLoading()){
                class_name += " ui-icon-loading";
            }else if (dir.dirIsOpened()){
                class_name += " ui-icon-folder-open";
            }else{
                class_name += " ui-icon-folder-collapsed";
            }
            $(dir_icon).addClass(class_name);

            // Path text
            var path_elem = document.createElement("a");
            title.appendChild(path_elem);
            if (dir.isRoot()){
                path_elem.appendChild(document.createTextNode(DirectoryView.i18n("root")));
            }else{
                path_elem.appendChild(document.createTextNode(dir.name(true)));
            }
            $(path_elem).click(function(){
                var dir = self.m_model.resource(dir_path);
                if (dir && dir.isLoaded()){
                    self.m_model.changePath(dir_path);
                    if (self.m_log_view){
                        self.m_log_view.change(self.m_model.repositoryInfo().root_url + dir_path,
                                               self.m_model.pegRevision());
                    }
                }else{
                    self.m_model.changePath(dir_path);
                    self.m_model.reloadPath(dir_path);
                    if (self.m_log_view){
                        self.m_log_view.change(self.m_model.repositoryInfo().root_url + dir_path,
                                               self.m_model.pegRevision());
                    }
                }
            });
            $(path_elem).hover(function(){
                $(parent).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(parent).removeClass("ui-state-hover").addClass("ui-state-default");
            });
            $(path_elem).dblclick(function(){
                self.m_model.reloadPath(dir_path);
            });

            return title;
        },

        createResourceNode: function(parent, rsc){
            var elem = document.createElement("dl");
            parent.appendChild(elem);

            // Information of this element
            var resource_title = document.createElement("dt");
            resource_title.className = DirectoryView.CLASS_RESOURCE_TITLE;
            elem.appendChild(resource_title);

            this.appendDirectoryNodeTitle(resource_title, rsc);

            if (rsc.isDirectory() && rsc.dirIsOpened()){
                // Information of children
                var children_root = document.createElement("dd");
                children_root.className = DirectoryView.CLASS_CHILDREN_ROOT;
                elem.appendChild(children_root);

                var ul_children = document.createElement("ul");
                children_root.appendChild(ul_children);

                rsc.childDirs().forEach(function(child){
                    var li = document.createElement("li");
                    ul_children.appendChild(li);
                    this.createResourceNode(li, child);
                }, this);
            }
        }
    };
    DirectoryView.i18n = i18n.translator({
        en: {
            root: "(root)"
        },
        ja: {
            root: "(root)"
        }
    });
    DirectoryView.CLASS_ROOT_DIV = "svn_root";
    DirectoryView.CLASS_RESOURCE_TITLE = "svn_resource_title";
    DirectoryView.CLASS_COLLAPSE_BUTTON = "dir_collapse";
    DirectoryView.CLASS_CHILDREN_ROOT = "svn_children_root";


    var FileListView = function(elem, model, log_view){
        // construct file list table.
        var table = document.createElement("table");
        elem.appendChild(table);
        table.className = FileListView.CLASS_ROOT_TABLE;

        var self = this;
        var attrs = FileListView.ROW_ATTRS;

        // header
        var createHeaderElement = function(th, attr){
            var span = document.createElement("span");
            th.appendChild(span);
            span.appendChild(document.createTextNode(FileListView.i18n(attr)));
            $(span).click(function(){
                if (self.m_sort.attr == attr){
                    self.m_sort.reverse = !(self.m_sort.reverse);
                }else{
                    self.m_sort.attr = attr;
                    self.m_sort.reverse = false;
                }
                self.update();
            });
        };

        var head = [];
        var thead = document.createElement("thead");
        table.appendChild(thead);
        var tr = document.createElement("tr");
        thead.appendChild(tr);
        var th = document.createElement("th");
        tr.appendChild(th);
        head.push(th);
        createHeaderElement(th, "name");
        attrs.forEach(function(attr){
            th = document.createElement("th");
            tr.appendChild(th);
            head.push(th);
            $(th).addClass(attr);
            createHeaderElement(th, attr);
        });

        // tbody
        var tbody = document.createElement("tbody");
        table.appendChild(tbody);

        this.m_model = model;
        this.m_log_view = log_view;
        this.m_table = table;
        this.m_thead = head;
        this.m_tbody = tbody;
        this.m_sort = { attr: "name", reverse: false };
        this.m_current_path = null;
        this.m_selected_path = null;

        this.updateSortingHint();
    };
    FileListView.prototype = {
        update: function(){
            var current_path = this.m_model.path();
            if (this.current_path != current_path){
                this.current_path = current_path;
                this.m_selected_path = null;
            }

            this.updateSortingHint();

            // remove
            while(this.m_tbody.firstChild){
                this.m_tbody.removeChild(this.m_tbody.firstChild);
            }

            // add
            var rsc = this.m_model.resource(current_path);
            if (!rsc){
                // Error!
                $(this.m_table).removeClass(FileListView.CLASS_LOADING);
                return;
            }

            if (rsc.isLoading()){
                this.createLoadingTable();
            }else if (rsc.isLoaded()){
                this.createLoadedTable(rsc);
            }
        },

        createLoadingTable: function(){
            var attrs = FileListView.ROW_ATTRS;
            $(this.m_table).addClass(FileListView.CLASS_LOADING);

            var tr = document.createElement("tr");
            this.m_tbody.appendChild(tr);

            var td = document.createElement("td");
            tr.appendChild(td);
            td.setAttribute("colspan", attrs.length + 1);

            var span = document.createElement("span");
            td.appendChild(span);
            span.appendChild(document.createTextNode(FileListView.i18n("loading")));
        },

        createLoadedTable: function(rsc){
            $(this.m_table).removeClass(FileListView.CLASS_LOADING);

            var sort_by = null;
            switch(this.m_sort.attr){
            case "author":
            case "revision":
            case "size":
                var attr = this.m_sort.attr;
                sort_by = function(item){ return item.info(attr) || ""; };
                break;
            case "date":
                sort_by = function(item){ return item.info("date").getTime(); };
                break;
            case "name":
            default:
                sort_by = function(item){ return item.name(true); };
                break;
            }
            var createSorter = function(sort_by){
                return function(l, r){
                    var lv = sort_by(l);
                    var rv = sort_by(r);
                    if (lv < rv){
                        return -1;
                    }else if (lv == rv){
                        return 0;
                    }else{
                        return 1;
                    }
                };
            };
            var createReversedSorter = function(sorter){
                return function(l, r){
                    return -sorter(l, r);
                };
            };

            var attr_sorter = createSorter(sort_by);
            if (this.m_sort.reverse){
                attr_sorter = createReversedSorter(attr_sorter);
            }

            var default_sorter = createSorter(function(item){ return item.name(true); });
            var sorter = function(l, r){
                var ret = attr_sorter(l, r);
                if (ret != 0){
                    return ret;
                }
                return default_sorter(l, r);
            };

            // Currently, directories and files are listed separately.
            rsc.childDirs().sort(sorter).forEach(function(item){
                this.createRow(item);
            }, this);
            rsc.childFiles().sort(sorter).forEach(function(item){
                this.createRow(item);
            }, this);
        },

        createRow: function(rsc, text /* =null */){
            var self = this;
            var path = rsc.path();

            var tr = document.createElement("tr");
            this.m_tbody.appendChild(tr);
            $(tr).addClass("ui-state-default");
            $(tr).hover(function(){
                $(this).removeClass("ui-state-default").addClass("ui-state-hover");
            }, function(){
                $(this).removeClass("ui-state-hover").addClass("ui-state-default");
            });
            $(tr).click(function(){
                if (self.m_log_view){
                    self.m_log_view.change(self.m_model.repositoryInfo().root_url + path,
                                           self.m_model.pegRevision());
                }
                self.m_selected_path = path;
                self.update();
            });
            if (this.m_selected_path == path){
                $(tr).addClass("ui-state-highlight");
            }

            // name
            var td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("name");
            var icon = document.createElement("span");
            td.appendChild(icon);
            var class_name = "ui-icon ui-icon-inline-block";
            if (rsc.isDirectory()){
                class_name += " ui-icon-folder-collapsed";
            }else if (rsc.isFile()){
                class_name += " ui-icon-document";
            }else{
                class_name += " ui-icon-help";
            }
            $(icon).addClass(class_name);
            var text_elem = document.createElement("a");
            td.appendChild(text_elem);
            $(text_elem).addClass(FileListView.CLASS_DIR_LINK);
            text_elem.appendChild(document.createTextNode(text || rsc.name(true)));
            if (rsc.isDirectory()){
                $(text_elem).click(function(){
                    if (rsc.isLoaded()){
                        self.m_model.changePath(path);
                    }else{
                        self.m_model.changePath(path);
                        self.m_model.reloadPath(path);
                    }
                });
            }else if (rsc.isFile()){
                $(text_elem).attr("href", rsc.contentUrl());
                $(text_elem).attr("target", "_blank");
            }

            // author
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("author");
            td.appendChild(document.createTextNode(rsc.info("author") || ""));

            // revision
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("revision");
            td.appendChild(document.createTextNode(rsc.info("revision")));

            // date
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("date");
            var time = document.createElement("time");
            td.appendChild(time);
            time.appendChild(document.createTextNode(i18n.date(rsc.info("date"))));
            time.setAttribute("datetime", rsc.info("date").toLocaleString());

            // size
            td = document.createElement("td");
            tr.appendChild(td);
            $(td).addClass("size");
            if (rsc.isFile()){
                var size = rsc.info("size");
                var size_str = "";
                if (size < 1000){
                    size_str = size + " B";
                }else if (size < 1000*1000){
                    size_str = (Math.round(size / 100.0) / 10.0) + " KB";
                }else{
                    size_str = (Math.round(size / (1000 * 100.0)) / 10.0) + " MB";
                }
                td.appendChild(document.createTextNode(size_str));
                td.setAttribute("title", size + " Byte");
            }else{
                td.appendChild(document.createTextNode(" - "));
            }
        },

        updateSortingHint: function(){
            // remove all
            $(this.m_thead[0]).find("span").removeClass(FileListView.CLASS_ASCENDANT + " "
                                                        + FileListView.CLASS_DESCENDANT);
            FileListView.ROW_ATTRS.forEach(function(attr, index){
                $(this.m_thead[index + 1]).find("span").removeClass(FileListView.CLASS_ASCENDANT + " "
                                                                    + FileListView.CLASS_DESCENDANT);
            }, this);

            // set class
            var cls = this.m_sort.reverse ? FileListView.CLASS_DESCENDANT : FileListView.CLASS_ASCENDANT;
            if (this.m_sort.attr == "name"){
                $(this.m_thead[0]).find("span").addClass(cls);
            }else{
                var idx = FileListView.ROW_ATTRS.indexOf(this.m_sort.attr);
                if (idx >= 0){
                    $(this.m_thead[idx + 1]).find("span").addClass(cls);
                }
            }
        }
    };
    FileListView.i18n = i18n.translator({
        en: {
            name: "Name",
            author: "Author",
            revision: "Revision",
            date: "Date",
            size: "Size",
            loading: "Loading..."
        },
        ja: {
            name: "ファイル名",
            author: "作者",
            revision: "リビジョン",
            date: "日付",
            size: "サイズ",
            loading: "読み込み中…"
        }
    });
    FileListView.ROW_ATTRS = [ "author", "revision", "date", "size" ];
    FileListView.CLASS_ROOT_TABLE = "file_list_view";
    FileListView.CLASS_LOADING = "loading";
    FileListView.CLASS_DIR_LINK = "dir_link";
    FileListView.CLASS_ASCENDANT = "ascendant";
    FileListView.CLASS_DESCENDANT = "descendant";


    var LogView = function(elem, url, revision){
        this.m_view_elem = elem;
        this.m_log_model = new DavSvnLogModel(url, revision);
        this.m_url = url;
        this.m_revision = revision;

        this.initializeLogModel();
    };
    LogView.prototype = {
        initializeLogModel: function(){
            if (this.m_log_model){
                this.m_log_model.removeListener(this);
            }

            this.m_log_model = new DavSvnLogModel(this.m_url, this.m_revision);
            this.m_log_model.addListener(this);
            this.m_log_model.loadInitialLogs(LogView.LOG_COUNT_STEP);
        },

        update: function(){
            this.updateLog();
        },

        change: function(url, revision){
            if (this.m_url != url || this.m_revision != revision){
                this.m_url = url;
                this.m_revision = revision;
                this.initializeLogModel();
            }
        },

        changeRevision: function(revision){
            if (this.m_revision != revision){
                this.m_revision = revision;
                this.initializeLogModel();
            }
        },

        updateLog: function(){
            if (this.m_log_model.isLoading()){
                $(this.m_view_elem).addClass(LogView.CLASS_LOADING);
            }else{
                $(this.m_view_elem).removeClass(LogView.CLASS_LOADING);
            }

            // add
            var elem = document.createElement("dl");
            this.m_view_elem.appendChild(elem);
            $(elem).addClass(LogView.CLASS_LOG_VIEW);

            var title = document.createElement("dt");
            elem.appendChild(title);
            title.appendChild(document.createTextNode(this.m_log_model.url()));

            var dd = document.createElement("dd");
            elem.appendChild(dd);
            var logs_root = document.createElement("dl");
            dd.appendChild(logs_root);
            this.m_log_model.eachLog(function(log){
                this.createLog(logs_root, log);
            }, this);

            var show_next_button_elem = null;
            if (this.m_log_model.hasMoreLogs()){
                show_next_button_elem = document.createElement("div");
                this.m_view_elem.appendChild(show_next_button_elem);

                if (this.m_log_model.isLoading()){
                    show_next_button_elem.appendChild(document.createTextNode(LogView.i18n("loading")));
                }else{
                    var button = document.createElement("input");
                    show_next_button_elem.appendChild(button);
                    button.setAttribute("type", "button");
                    $(button).button({ label: LogView.i18n("show_older_logs") });

                    var self = this;
                    $(button).click(function(){
                        self.m_log_model.loadMoreLogs(LogView.LOG_COUNT_STEP);
                    });
                }
            }

            // then remove current logs to keep scroll position.
            var removed_children = Array.prototype.filter.call(this.m_view_elem.childNodes, function(item){
                return item != elem && item != show_next_button_elem;
            });
            removed_children.forEach(function(item){
                this.m_view_elem.removeChild(item);
            }, this);
        },

        createLog: function(logs_root, log){
            var dt = document.createElement("dt");
            logs_root.appendChild(dt);

            // toggle button
            var toggle_button = document.createElement("span");
            dt.appendChild(toggle_button);
            $(toggle_button).addClass("ui-icon ui-icon-triangle-1-e ui-icon-inline-block");
            $(dt).addClass(LogView.CLASS_COLLAPSED);
            $(toggle_button).click(function(){
                if ($(dt).hasClass(LogView.CLASS_COLLAPSED)){
                    $(dt).removeClass(LogView.CLASS_COLLAPSED);
                    $(this).removeClass("ui-icon-triangle-1-e");
                    $(this).addClass("ui-icon-triangle-1-se");
                    $(dt).next().children().show("blind");
                }else{
                    $(dt).addClass(LogView.CLASS_COLLAPSED);
                    $(this).removeClass("ui-icon-triangle-1-se");
                    $(this).addClass("ui-icon-triangle-1-e");
                    $(dt).next().children().hide("blind");
                }
            });

            // revision
            var elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_REVISION);
            elem.appendChild(document.createTextNode(log.revision));

            // date
            elem = document.createElement("time");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_DATE);
            elem.appendChild(document.createTextNode(i18n.date(log.date)));
            elem.setAttribute("datetime", log.date.toLocaleString());

            // author
            elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_AUTHOR);
            elem.appendChild(document.createTextNode(log.author || ""));

            // first line of log
            elem = document.createElement("span");
            dt.appendChild(elem);
            $(elem).addClass(LogView.CLASS_COMMENT);
            var comment = (log.comment || "");
            var length = comment.indexOf("\n");
            if (length < 0 || length > LogView.COMMENT_LENGTH){
                length = LogView.COMMENT_LENGTH;
            }
            var text = comment.substr(0, length);
            if (text.length < comment.length){
                text += "...";
            }
            elem.appendChild(document.createTextNode(text));

            // log
            var dd = document.createElement("dd");
            logs_root.appendChild(dd);
            var div = document.createElement("div");
            dd.appendChild(div);
            div.appendChild(document.createTextNode(comment));
            $(div).hide();  // log comment is hidden in default.

            // changes
            var items = log.paths;
            if (items.length > 0){
                var ul = document.createElement("ul");
                dd.appendChild(ul);
                $(ul).addClass(LogView.CLASS_PATH_LIST);
                items.forEach(function(item){
                    var li = document.createElement("li");
                    ul.appendChild(li);

                    var span = document.createElement("span");
                    li.appendChild(span);
                    span.appendChild(document.createTextNode(item.type));
                    $(span).addClass(LogView.CLASS_PATH_TYPE + " " + item.type);

                    var span = document.createElement("span");
                    li.appendChild(span);
                    var text = item.path;
                    if (item.copyfrom_path && item.copyfrom_rev){
                        text += " " + "(" + item.copyfrom_path + "@" + item.copyfrom_rev + ")";
                    }
                    span.appendChild(document.createTextNode(text));
                    $(span).addClass(LogView.CLASS_PATH_NAME);
                });
                $(ul).hide();
            }
        }
    };
    LogView.i18n = i18n.translator({
        en: {
            show_older_logs: "Show older logs.",
            loading: "Loading..."
        },
        ja: {
            show_older_logs: "古いログを表示",
            loading: "読み込み中…"
        }
    });
    LogView.CLASS_LOG_VIEW = "log_view";
    LogView.CLASS_REVISION = "revision";
    LogView.CLASS_AUTHOR = "author";
    LogView.CLASS_DATE = "date";
    LogView.CLASS_COMMENT = "comment";
    LogView.CLASS_PATH_LIST = "path_list";
    LogView.CLASS_PATH_TYPE = "path_type";
    LogView.CLASS_PATH_NAME = "path_name";
    LogView.CLASS_COLLAPSED = "collapsed";
    LogView.CLASS_LOADING = "loading";
    LogView.COMMENT_LENGTH = 40;
    LogView.LOG_COUNT_STEP = 20;

    var RevisionSettingView = function(elem, model, log_view){
        this.m_elem = elem;
        this.m_model = model;
        this.m_log_view = log_view;
        this.m_revision = null;

        this.setClickHandler();
    };
    RevisionSettingView.prototype = {
        update: function(){
            var revision = this.m_model.pegRevision();
            if (revision != this.m_revision){
                while(this.m_elem.firstChild){
                    this.m_elem.removeChild(this.m_elem.firstChild);
                }

                this.m_elem.appendChild(document.createTextNode(revision));
                this.m_revision = revision;
            }
        },

        setClickHandler: function(){
            var self = this;
            var option = { autoOpen: false, title: RevisionSettingView.i18n("set_revision"),
                           modal: true,
                           buttons: {} };
            option.buttons[RevisionSettingView.i18n("ok")] = function(){
                var revision = $(this).find("input").attr("value");
                if (!String(revision).match(RevisionSettingView.REVISION_PATTERN)){
                    self.m_revision_dialog.find(".error_message").show();
                    return false;
                }

                if (self.m_log_view){
                    self.m_log_view.changeRevision(revision);
                }
                self.m_model.setRevision((revision == "HEAD" ? revision : parseInt(revision)));
                $(this).dialog("close");
            };
            this.m_revision_dialog = $("<div></div>")
                .html("<p class='error_message ui-state-error' style='display: none;'>"
                      + "<span class='ui-icon ui-icon-alert ui-icon-inline-block'></span>"
                      + RevisionSettingView.i18n("error_message")
                      + "</p>"
                      + "<p><label>" + RevisionSettingView.i18n("revision") + " <input type='text' value='' /></label></p>")
                .dialog(option);
            $(this.m_elem).click(function(){
                self.m_revision_dialog.dialog("open");
            });
        }
    };
    RevisionSettingView.i18n = i18n.translator({
        en: {
            set_revision: "Set revision.",
            revision: "Revision",
            ok: "Ok",
            error_message: "Revision must be number or 'HEAD'."
        },
        ja: {
            set_revision: "リビジョン指定",
            revision: "リビジョン",
            ok: "OK",
            error_message: "リビジョンは数値か 'HEAD' にしてください。"
        }
    });
    RevisionSettingView.REVISION_PATTERN = /^(HEAD|[0-9]+)$/;


    var initialize = function(url, rev){
        // splitter
        $("#content_frame").splitter({
            splitVertical: true,
            sizeLeft: true
        });
        $(window).resize(function(e){
            // resize event seems to be fired when one of the children is resized.
            if (e.target == window){
                $("#content_frame").trigger("resize");
            }
        });

        // model
        var model = new DavSvnModel(url, rev, true);

        // log view
        var log_view = new LogView(document.getElementById("log_view"), url, model.pegRevision());

        // file list
        var file_list_view = new FileListView(document.getElementById("file_list"), model, log_view);
        model.addListener(file_list_view);

        // revision setting
        var revision_setting_view = new RevisionSettingView(document.getElementById("revision_setting"), model, log_view);
        model.addListener(revision_setting_view);

        // path view
        var path_view = new PathView(document.getElementById("path_view"), model, log_view);
        model.addListener(path_view);

        // directory view
        var dv = new DirectoryView(document.getElementById("dir_tree"), model, log_view);
        model.addListener(dv);

        // resizable content_widget
        $("#content_widget").resizable({
            handles: "s",
            helper: "ui-resize-helper",
            stop: function(event, ui){
                var height = $("#content_widget").innerHeight() - $("#content_header").outerHeight();
                if (height < 0){
                    height = 10;
                }
                $("#dir_tree").css("height", height + "px");
                $("#file_list").css("height", height + "px");
                $("#content_frame").css("height", height + "px").trigger("resize");
            }
        });
    };

    var createToggleAjaxViewButton = function(ajaxview, url, revision){
        var link = "";
        var text = "";
        if (ajaxview){
            link = url;
            if (revision != "HEAD"){
                link += "?p=" + revision;
            }
            text = "Normal View";
        }else{
            link = url + "?ajaxview";
            if (revision != "HEAD"){
                link += "&p=" + revision;
            }
            text = "Ajax View";
        }

        var elem = document.createElement("a");
        elem.setAttribute("href", link);
        var toggle_ajaxview = document.getElementById("toggle_ajaxview");
        toggle_ajaxview.appendChild(elem);
        $(toggle_ajaxview).show();
        elem.appendChild(document.createTextNode(text));
    };

    var isSupportedBrowser = function(){
        // I checked only Firefox, Chrome and Safari.
        if (!$.browser.webkit && !$.browser.mozilla){
            return false;
        }
        if (typeof(window.history.pushState) != "function"){
            return false;
        }
        return true;
    };

    var load = function(){
        if (!isSupportedBrowser()){
            return;
        }

        var obj = DavSvnPjaxState.parseUrl(location.href);
        var url = obj.url;
        var rev = "HEAD";
        if (obj.params["p"] && obj.params["p"] != "HEAD"){
            rev = parseInt(obj.params["p"]);
        }

        createToggleAjaxViewButton(obj.params["ajaxview"], url, rev);
        if (!obj.params["ajaxview"]){
            return;
        }

        $("#main").show();
        $(".svn").hide();
        initialize(url, rev);
    };

    load();
});

