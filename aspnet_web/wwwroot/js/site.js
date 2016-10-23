this.robymes = (function (robymes) {
    var ctor = function () {
        var self = this;
        self.getItemsProcessed = function () {
            jQuery.get("http://localhost:8080/itemsProcessed")
                .done(function (result) {
                    return;
                })
                .fail(function () {
                    return;
                });
        };
    };
    robymes.ApiService = function () {
        return new ctor();
    };
    return robymes;
}(this.robymes || {}));

this.robymes = (function (robymes) {
    jQuery(document).ready(function () {
        var apiService = robymes.ApiService();
        setInterval(apiService.getItemsProcessed, 1000);
    });
    return robymes;
}(this.robymes || {}));