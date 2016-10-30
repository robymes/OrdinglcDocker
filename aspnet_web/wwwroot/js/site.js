this.robymes = (function (robymes) {
    var ctor = function () {
        var self = this,
            serviceUrl = jQuery("#serviceUrl").val();
        self.getItemsProcessed = function () {
            jQuery.get("http://" + serviceUrl + "/itemsProcessed")
                .done(function (result) {
                    jQuery("#alertMessage").addClass("hide");
                    jQuery("#processedCount").text(result.processedCount);
                    jQuery("#notProcessedCount").text(result.notProcessedCount);
                })
                .fail(function () {
                    jQuery("#alertMessage").removeClass("hide");
                    jQuery("#processedCount").text("-");
                    jQuery("#notProcessedCount").text("-");
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