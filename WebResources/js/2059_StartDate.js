// ============================================================
// 2059_StartDate.js — Start Date Auto-Format Handler
// ============================================================
// Reusable handler for the cw_startdate field.
// Auto-formats raw numeric input (e.g. 10101998) to MM/DD/YYYY.
// Entity:  cw_personphonenumber (sub-grid on Person table form)
// Form:    Quick Create Form
// Event:   OnLoad
// ============================================================

window.CW = window.CW || {};
CW.PhoneNumber = CW.PhoneNumber || {};

window.CW.startDateHandler = function (formContext) {
    var START_DATE_FIELD = "cw_startdate";

    var startDateAttr = formContext.getAttribute(START_DATE_FIELD);
    if (!startDateAttr) {
        console.warn(
            "startDateHandler: Field '" + START_DATE_FIELD +
            "' not found on the form. Verify the logical name."
        );
        return;
    }

    // Auto-format raw numeric input (e.g. "10101998") to MM/DD/YYYY on blur
    startDateAttr.controls.forEach(function (ctrl) {
        var ctrlName = ctrl.getName();
        setTimeout(function () {
            var input = document.querySelector("input[data-id='" + ctrlName + ".fieldControl-date-time-input']")
                || document.querySelector("[data-id='" + ctrlName + "'] input")
                || document.getElementById(ctrlName + "_datepicker_description");
            if (!input) return;

            input.addEventListener("blur", function () {
                var raw = input.value.replace(/\D/g, "");
                // Support 7-digit input (MDDYYYY) by padding to 8 digits (MMDDYYYY)
                if (raw.length === 7) {
                    raw = "0" + raw;
                }
                if (raw.length === 8) {
                    var mm = parseInt(raw.substring(0, 2), 10);
                    var dd = parseInt(raw.substring(2, 4), 10);
                    var yyyy = parseInt(raw.substring(4, 8), 10);
                    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999) {
                        var dateObj = new Date(yyyy, mm - 1, dd);
                        // Verify the date didn't roll over (e.g. Feb 30 → Mar 2)
                        if (dateObj.getMonth() === mm - 1 && dateObj.getDate() === dd) {
                            startDateAttr.setValue(dateObj);
                            startDateAttr.fireOnChange();
                        }
                    }
                }
            });
        }, 500);
    });
};
