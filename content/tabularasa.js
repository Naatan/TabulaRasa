if (typeof(ko) == 'undefined')
{
    var ko = {};
}

ko.tabularasa = {};

(function() {
    
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    
    var prefs = require("ko/prefs");
    var log = require("ko/logging").getLogger("tabularasa");
    
    this.init = function()
    {
        prefs.prefObserverService.addObserver(this, "koSkin_custom_skin", false);
        prefs.prefObserverService.addObserver(this, "tabularasa_colors", false);
        
        var colors = prefs.getString('tabularasa_colors', '');
        if (colors == '')
        {
            this.parseColors();
        }
        
        this.observe();
    }
    
    this.observe = function()
    {
        var value = prefs.getString("koSkin_custom_skin", "default");
        if (value.indexOf('tabularasa') == -1)
            this.reset();
        else
            this.apply();
    }
    
    this.parseColors = function(save = true)
    {
        var addonPath = this.getPath();
        if ( ! addonPath) return;
        
        var ioFile = require("sdk/io/file");
        var filepath = ioFile.join(addonPath, "skin", "colors.less");
        var contents = ioFile.read(filepath);
        
        var parsed = {};
        var colors = contents.match(/@[\w-]+:\s+[\w#\(\),]+/g);
        for (let entry of colors)
        {
            let [_,key,value] = entry.split(/@|:/g);
            parsed[key] = value.replace(/\s+/g,'');
        }
        
        if (save) ko.prefs.setString('tabularasa_colors', JSON.stringify(parsed));
        
        return parsed;
    }
    
    this.reset = function()
    {
        this.writeColors('');
        
        var $ = require("ko/dom");
        var toolbox = $("#toolbox_main");
        $("#komodo-notificationbox").before(toolbox);
        
        $("#komodo_main").removeClass("_tr_loaded");
    }
    
    this.apply = function()
    {
        var colors = prefs.getString("tabularasa_colors", "{}");
        colors = JSON.parse(colors);
        
        var colorString = "";
        for (let name in colors)
        {
            colorString += "@" + name + ": " + colors[name] + ";\n";
            colorString += "@escaped-" + name + ": " + encodeURIComponent(colors[name]) + ";\n";
        }
        
        this.writeColors(colorString);
        
        var $ = require("ko/dom");
        var toolbox = $("#toolbox_main");
        $("#workspace_left_area").before(toolbox);
        
        $("#komodo_main").addClass("_tr_loaded");
        
        var {koLess} = Cu.import("chrome://komodo/content/library/less.js", {});
        koLess.reload(true);
        setTimeout(function()
        {
            koLess.reload();
        }, 100);
    }
    
    this.getPath = function()
    {
        var sys = require('sdk/system');
        var ioFile = require("sdk/io/file");
        var stack = require("ko/console")._parseStack((new Error()).stack);
        var filepath = null;
        for (let entry of stack)
        {
            if ( ! ("fileName" in entry)) continue;
            if (entry.fileName.indexOf("tabularasa.js") != -1)
            {
                var koResolve = Cc["@activestate.com/koResolve;1"].getService(Ci.koIResolve);
                filepath = koResolve.uriToPath(entry.fileName);
                filepath = ioFile.join(ioFile.dirname(filepath), "..");
                break;
            }
        }
        
        if ( ! filepath)
            log.warning("Could not resolve tabularasa.js path");
        
        return filepath;
    }
    
    this.writeColors = function(colorString)
    {
        var addonPath = this.getPath();
        if ( ! addonPath) return;
        
        var ioFile = require("sdk/io/file");
        var filepath = ioFile.join(addonPath, "skin", "colors_override.less");
        
        var file = ioFile.open(filepath, "w");
        file.write(colorString);
        file.close();
    }
    
    window.addEventListener("komodo-post-startup", this.init.bind(this));
    
}).apply(ko.tabularasa);