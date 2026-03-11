
// Ensure global CW namespace exists
window.CW = window.CW || {};
CW.PhoneNumber = CW.PhoneNumber || {};

// ----------------------------------------------------------------
// Effective Date Auto-Format Handler
// Reusable handler for the cw_effectivedate field.
// Auto-formats raw numeric input (e.g. 10101998) to MM/DD/YYYY.
// ----------------------------------------------------------------

window.CW.effectiveDateHandler = function (formContext) {
    var EFFECTIVE_DATE_FIELD = "cw_effectivedate";

    var effectiveDateAttr = formContext.getAttribute(EFFECTIVE_DATE_FIELD);
    if (!effectiveDateAttr) {
        console.warn(
            "effectiveDateHandler: Field '" + EFFECTIVE_DATE_FIELD +
            "' not found on the form. Verify the logical name."
        );
        return;
    }

    // Auto-format raw numeric input (e.g. "12131998") to MM/DD/YYYY.
    // Strategy:
    //   1. Capture raw digits via DOM "input" event on every keystroke
    //   2. When the platform rejects the raw input and reverts (onChange fires),
    //      use addOnChange to detect the revert and re-set the parsed date
    //   3. Clear any error notifications on the control
    var lastRawDigits = "";
    var settingValue = false; // guard to prevent recursive onChange

    // SDK onChange handler — fires when the platform reverts the value
    effectiveDateAttr.addOnChange(function () {
        if (settingValue) return; // skip our own setValue calls

        var raw = lastRawDigits;
        if (raw.length !== 8) return;

        var mm = parseInt(raw.substring(0, 2), 10);
        var dd = parseInt(raw.substring(2, 4), 10);
        var yyyy = parseInt(raw.substring(4, 8), 10);

        if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999) {
            var dateObj = new Date(yyyy, mm - 1, dd);
            if (dateObj.getMonth() === mm - 1 && dateObj.getDate() === dd) {
                lastRawDigits = ""; // clear stored digits
                settingValue = true;
                effectiveDateAttr.setValue(dateObj);
                // Clear error notifications on all controls for this field
                effectiveDateAttr.controls.forEach(function (c) {
                    c.clearNotification();
                });
                settingValue = false;
            }
        }
    });

    // Attach DOM "input" listener to capture raw keystrokes
    effectiveDateAttr.controls.forEach(function (ctrl) {
        var ctrlName = ctrl.getName();

        function attachInputListener() {
            var input = document.querySelector("input[data-id='" + ctrlName + ".fieldControl-date-time-input']")
                || document.querySelector("[data-id='" + ctrlName + "'] input")
                || document.getElementById(ctrlName + "_datepicker_description");

            if (!input) {
                setTimeout(attachInputListener, 500);
                return;
            }

            // Store raw digits on every keystroke
            input.addEventListener("input", function () {
                var digits = input.value.replace(/\D/g, "");
                if (digits.length > 0) {
                    lastRawDigits = digits;
                }
            });
        }

        setTimeout(attachInputListener, 500);
    });
};

CW.PhoneNumber.Main = CW.PhoneNumber.Main || (function () {
    "use strict";

    const PRIMARY_NO = 471560000;
    const PRIMARY_YES = 471560001;

    function getFormContext(executionContext) {
        return executionContext && executionContext.getFormContext
            ? executionContext.getFormContext()
            : (typeof Xrm !== "undefined" ? Xrm.Page : null);
    }

    function onLoad(executionContext) {
        const formContext = getFormContext(executionContext);
        if (!formContext) return;

        if (CW.PhoneNumber.AttachEvents) {
            CW.PhoneNumber.AttachEvents(formContext);
        }

        if (window.CW.effectiveDateHandler) {
            window.CW.effectiveDateHandler(formContext);
        }

        formatPhoneNumber(executionContext);
        setNameField(executionContext);
    }

    function onSave(executionContext) {
        const formContext = getFormContext(executionContext);
        if (!formContext) return;

        const eventArgs = executionContext.getEventArgs();
        if (!eventArgs) return;

        // allow save after popup confirmation
        if (formContext._allowSaveOnce === true) {
            formContext._allowSaveOnce = false;
            return;
        }

        // only for create form
        if (formContext.ui.getFormType() !== 1) {
            formatPhoneNumber(executionContext);
            return;
        }

        formatPhoneNumber(executionContext);

        const personAttr =
            formContext.getAttribute("cw_personid") ||
            formContext.getAttribute("cw_person");

        const primaryAttr = formContext.getAttribute("cw_primaryphonenumber");

        if (!personAttr || !primaryAttr) return;

        const personValue = personAttr.getValue();
        if (!personValue || personValue.length === 0) return;

        const personId = personValue[0].id.replace(/[{}]/g, "");
        const isPrimary = primaryAttr.getValue();

        if (isPrimary !== PRIMARY_NO) return;

        // stop original save
        eventArgs.preventDefault();

        getExistingPhoneCount(personId)
            .then(function (existingCount) {
                if (existingCount <= 0) {
                    return Xrm.Navigation.openAlertDialog({
                        title: "Phone Number",
                        text: "A primary phone number is required. This phone number will be set to primary because it is the only phone number on record."
                    }).then(function () {
                        primaryAttr.setValue(PRIMARY_YES);
                        primaryAttr.fireOnChange();

                        formContext._allowSaveOnce = true;

                        setTimeout(function () {
                            formContext.data.save();
                        }, 300);
                    });
                } else {
                    return Xrm.Navigation.openConfirmDialog(
                        {
                            title: "Phone Number Warning",
                            text: "The phone number being added is not selected as the primary phone number.",
                            confirmButtonLabel: "OK",
                            cancelButtonLabel: "Back"
                        },
                        {
                            height: 220,
                            width: 500
                        }
                    ).then(function (result) {
                        if (result.confirmed) {
                            formContext._allowSaveOnce = true;

                            setTimeout(function () {
                                formContext.data.save();
                            }, 300);
                        }
                    });
                }
            })
            .catch(function (error) {
                console.error("OnSave error:", error);
            });
    }

    function getExistingPhoneCount(personId) {
        return new Promise(function (resolve, reject) {
            Xrm.WebApi.retrieveMultipleRecords(
                "cw_personphonenumber",
                "?$select=cw_personphonenumberid&$filter=_cw_personid_value eq " + personId + "&$top=2"
            ).then(
                function (result) {
                    resolve(result.entities ? result.entities.length : 0);
                },
                function () {
                    Xrm.WebApi.retrieveMultipleRecords(
                        "cw_personphonenumber",
                        "?$select=cw_personphonenumberid&$filter=_cw_person_value eq " + personId + "&$top=2"
                    ).then(
                        function (result2) {
                            resolve(result2.entities ? result2.entities.length : 0);
                        },
                        function (error2) {
                            reject(error2);
                        }
                    );
                }
            );
        });
    }

    function formatPhoneNumber(executionContext) {
        const formContext = getFormContext(executionContext);
        if (!formContext) return;

        const phNoAttr = formContext.getAttribute("cw_phonenumber");
        if (!phNoAttr) return;

        const value = phNoAttr.getValue();
        if (!value) return;

        const clean = value.replace(/\D/g, "");

        if (clean.length === 10) {
            const formatted = clean.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
            if (formatted !== value) {
                phNoAttr.setValue(formatted);
                phNoAttr.fireOnChange();
            }
        }
    }

    function setNameField(executionContext) {
        const formContext = getFormContext(executionContext);
        if (!formContext) return;

        const personAttribute =
            formContext.getAttribute("cw_personid") ||
            formContext.getAttribute("cw_person");

        const titleAttribute = formContext.getAttribute("cw_name");

        if (personAttribute && titleAttribute) {
            const personValue = personAttribute.getValue();

            if (personValue != null && personValue.length > 0) {
                const personName = personValue[0].name;
                titleAttribute.setValue(personName);
            } else {
                titleAttribute.setValue(null);
            }
        }
    }

    return {
        OnLoad: onLoad,
        OnSave: onSave,
        setNameField: setNameField,
        FormatPhoneNumber: formatPhoneNumber,
        __namespace: true,
        __typeName: "CW.PhoneNumber.Main"
    };
})();
