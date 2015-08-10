var $ = require("ko/dom");
var prefs = require("ko/prefs");
var log = require("ko/logging").getLogger("tabularasa");

function customColor(name) {
    var colorpicker = $(".colorpicker[name="+name+"]").element();
    var color = colorpicker.color;
    
    if (color.length == 4)
    {
        color = color + color.substr(1);
    }
    
    // Prefer the locally preferenced color picker:
    var picker = null;
    var cid = prefs.getStringPref("colorpicker_cid");
    if (cid) {
        try {
            picker = Components.classes[cid]
                               .getService(Components.interfaces.koIColorPickerAsync);
        } catch (ex) {
            log.exception("Unable to load the colorpicker with CID: " + cid);
            picker = null;
        }
    }
    if (!picker) {
        // Use the sysUtils color picker then:
        picker = Components.classes['@activestate.com/koSysUtils;1']
                           .getService(Components.interfaces.koIColorPickerAsync);
    }
    
    picker.pickColorAsync(function(newcolor) {
        if (newcolor) {
            colorpicker.color = newcolor;
            colorpicker.firstChild.setAttribute("style", "background: " + newcolor);
        }
    }, color, 1.0, colorpicker.boxObject.screenX, colorpicker.boxObject.screenY);
}

var onloadColors = {};
function trLoad()
{
    var colors = JSON.parse(prefs.getString('tabularasa_colors', '{}'));
    onloadColors = colors;
    $(".colorpicker").each(function() {
        var el = $(this);
        var name = el.attr("name");
        el.on("click", customColor.bind(this, name));
        
        if ((name in colors)) 
            this.color = colors[name];
        else
            this.color = "#000";
            
        this.firstChild.setAttribute("style", "background: " + this.color);
    });
    
    $("#koSkin_custom_skin").on("command", toggleElements);
    $("#koSkin_custom_icons").on("command", toggleElements);
    
    toggleElements();
}

function toggleElements()
{
    var schemeElem = $("#koSkin_scheme_skinning").parent();
    var scrollbarElem = $("#koSkin_use_custom_scrollbars").parent();
    var skinColors = $("#skin_colors");
    var iconColors = $("#colors_icons");
    
    if ($("#koSkin_custom_skin").attr("label") == "Tabula Rasa")
    {
        schemeElem.hide();
        scrollbarElem.hide();
        skinColors.show();
    }
    else
    {
        schemeElem.show();
        scrollbarElem.show();
        skinColors.hide();
    }
    
    if ($("#koSkin_custom_icons").attr("label") == "Tabula Rasa")
        iconColors.show();
    else
        iconColors.hide();
}

function OnPreferencePageOK(prefset) /* Hacky, but this stuff is hacky by definition */
{
    var colors = JSON.parse(prefset.getString('tabularasa_colors', '{}'));
    $(".colorpicker").each(function() {
        var el = $(this);
        var name = el.attr("name");
        colors[name] = this.color;
    });
    
    prefset.setString('tabularasa_colors', JSON.stringify(colors));
    return true;
}

function defaultColors()
{
    var ko = window.parent.opener.ko;
    var colors = ko.tabularasa.parseColors(false);
    resetColorsUsing(colors);
}

function resetColors()
{
    resetColorsUsing(onloadColors);
}

function resetColorsUsing(colors)
{
    $(".colorpicker").each(function() {
        var el = $(this);
        var name = el.attr("name");
        
        if (name in colors)
        {
            this.color = colors[name];
            this.firstChild.setAttribute("style", "background: " + this.color);
        }
    });
}

function exportColors()
{
    var colors = {};
    $(".colorpicker").each(function() {
        var el = $(this);
        var name = el.attr("name");
        colors[name] = this.color;
    });
    var colorString = JSON.stringify(colors);
    
    var ko = window.parent.opener.ko;
    var path = ko.filepicker.saveFile(
                null, /* default directory */
                "my-tabularasa-theme.json", /* default name */
                "Save As...");
    
    var ioFile = require("sdk/io/file");
    var file = ioFile.open(path, "w");
    file.write(colorString);
    file.close();
}

function importColors()
{
    var ko = window.parent.opener.ko;
    var path = ko.filepicker.browseForFile(null, null, "Select Theme File");
    if (path === null) {
        return;
    }
    var ioFile = require("sdk/io/file");
    
    try
    {
        var colorString = ioFile.read(path);
        var colors = JSON.parse(colorString);
    }
    catch (e)
    {
        alert("No colors will be imported (" + e.message + ")");
        return;
    }
    
    resetColorsUsing(colors);
}

window.addEventListener('load', trLoad, false);
