
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
    //
    // Why this approach works:
    //   Previous attempts (format on "input", intercept "blur") failed because
    //   Dynamics 365 / React uses "focusout" for validation, and the platform's
    //   own handlers overwrite values set during "input".
    //
    //   Solution: format BEFORE blur ever fires.
    //   - "keydown" (Tab / Enter) fires before blur
    //   - "mousedown" on document (click away) fires before blur
    //   - "focusout" capture phase as a final safety net
    //   By the time the platform's blur/focusout handler runs, the input
    //   already contains "MM/DD/YYYY" → no error.
    var nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, "value"
    ).set;

    effectiveDateAttr.controls.forEach(function (ctrl) {
        var ctrlName = ctrl.getName();

        function attachListeners() {
            var input = document.querySelector("input[data-id='" + ctrlName + ".fieldControl-date-time-input']")
                || document.querySelector("[data-id='" + ctrlName + "'] input")
                || document.getElementById(ctrlName + "_datepicker_description");

            if (!input) {
                setTimeout(attachListeners, 500);
                return;
            }

            // Core formatting function — idempotent, safe to call multiple times
            function formatIfNeeded() {
                var raw = input.value.replace(/\D/g, "");
                if (raw.length !== 8) return false;

                var mm = parseInt(raw.substring(0, 2), 10);
                var dd = parseInt(raw.substring(2, 4), 10);
                var yyyy = parseInt(raw.substring(4, 8), 10);

                if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 9999) return false;

                var dateObj = new Date(yyyy, mm - 1, dd);
                if (dateObj.getMonth() !== mm - 1 || dateObj.getDate() !== dd) return false;

                var formatted = (mm < 10 ? "0" + mm : mm) + "/"
                    + (dd < 10 ? "0" + dd : dd) + "/" + yyyy;

                // Set via native setter so React picks up the change
                nativeSetter.call(input, formatted);
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));

                // Also set via SDK
                effectiveDateAttr.setValue(dateObj);
                effectiveDateAttr.fireOnChange();
                return true;
            }

            // 1) Tab / Enter — fires BEFORE blur
            input.addEventListener("keydown", function (e) {
                if (e.key === "Tab" || e.key === "Enter") {
                    formatIfNeeded();
                }
            });

            // 2) Click outside — mousedown fires BEFORE blur
            document.addEventListener("mousedown", function (e) {
                if (document.activeElement === input && !input.contains(e.target)) {
                    formatIfNeeded();
                }
            }, true);

            // 3) focusout capture — final safety net (React uses focusout, not blur)
            input.addEventListener("focusout", function () {
                formatIfNeeded();
            }, true);
        }

        setTimeout(attachListeners, 500);
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
