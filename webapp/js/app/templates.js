define(['text!templates/credits.html',
    'text!templates/overlay.html',
    'text!templates/popup.html',
    'text!templates/sections.html',
    'text!templates/sections_polling_tables.html',
    'text!templates/cartocss.css'], 
    function(credits, overlay, popup, sections, polling, cartocss) {
        return {
            credits: credits,
            overlay: overlay,
            popup: popup,
            sections: sections,
            polling: polling,
            cartocss: cartocss
        }
});