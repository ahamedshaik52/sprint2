// ============================================================
// 2059.js — Phone Number Quick Create Form
// ============================================================
// ALPT-2059: Record Effective Date on Quick Create Phone Numbers Panel
// Handles: Phone formatting, name field, primary phone check,
//          and Effective Date validation.
// Entity:  cw_personphonenumber (sub-grid on Person table form)
// Form:    Quick Create Form
// Events:  OnLoad, OnSave
//
// Acceptance Criteria:
//   AC2 — Manual entry auto-formats to MM/DD/YYYY, saves on blur.
//   AC3 — Calendar picker populates MM/DD/YYYY, saves on blur.
//
// Business Rules — Effective Date:
//   - Must follow system date format (MM/DD/YYYY)
//   - Cannot be blank (field is required)
//   - Date cannot be in the future
//   - Text box only allows numeric values
// ============================================================

window.CW = window.CW || {};
CW.PhoneNumber = CW.PhoneNumber || {};

// ----------------------------------------------------------------
// Effective Date Handler
// Sets the field as required, auto-formats to local midnight
// (MM/DD/YYYY), and blocks future dates.
// ----------------------------------------------------------------

window.CW.effectiveDateHandler = function (formContext) {
    var EFFECTIVE_DATE_FIELD = "new_effectivedate"; // <-- Change to your actual field logical name

    var effectiveDateAttr = formContext.getAttribute(EFFECTIVE_DATE_FIELD);
    if (!effectiveDateAttr) {
        console.warn(
            "effectiveDateHandler: Field '" + EFFECTIVE_DATE_FIELD +
            "' not found on the form. Verify the logical name."
        );
        return;
    }

    // Business Rule: Effective Date cannot be blank — mark as required
    effectiveDateAttr.setRequiredLevel("required");

    // AC2: Auto-format raw numeric input (e.g. "10101998") to MM/DD/YYYY
    // CRM's native date field does NOT parse raw digits — it needs slashes.
    // We attach a blur listener on the actual DOM input to intercept the
    // raw text, parse 8-digit input as MMDDYYYY, and set the CRM value.
    effectiveDateAttr.controls.forEach(function (ctrl) {
        var ctrlName = ctrl.getName();
        // Allow the DOM to render, then attach the blur handler
        setTimeout(function () {
            var input = document.querySelector("input[data-id='" + ctrlName + ".fieldControl-date-time-input']")
                || document.querySelector("[data-id='" + ctrlName + "'] input")
                || document.getElementById(ctrlName + "_datepicker_description");
            if (!input) return;

            input.addEventListener("blur", function () {
                var raw = input.value.replace(/\D/g, "");
                // Only auto-format unambiguous 8-digit input (MMDDYYYY).
                // 7-digit input is ambiguous (e.g. "1231994" could be
                // 1/23/1994 or 12/3/1994), so we leave it for the user to clarify.
                if (raw.length === 8) {
                    var mm = parseInt(raw.substring(0, 2), 10);
                    var dd = parseInt(raw.substring(2, 4), 10);
                    var yyyy = parseInt(raw.substring(4, 8), 10);
                    // Basic validation: valid month, day, and reasonable year
                    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && yyyy >= 1900 && yyyy <= 9999) {
                        var dateObj = new Date(yyyy, mm - 1, dd);
                        // Verify the date didn't roll over (e.g. Feb 30 → Mar 2)
                        if (dateObj.getMonth() === mm - 1 && dateObj.getDate() === dd) {
                            effectiveDateAttr.setValue(dateObj);
                            effectiveDateAttr.fireOnChange();
                        }
                    }
                }
            });
        }, 500);
    });

    // Business Rule: Date cannot be in the future — validate on change
    effectiveDateAttr.addOnChange(function () {
        var selectedDate = effectiveDateAttr.getValue();
        if (selectedDate) {
            // Normalize to local midnight so CRM displays MM/DD/YYYY correctly
            var mm = selectedDate.getMonth();
            var dd = selectedDate.getDate();
            var yyyy = selectedDate.getFullYear();
            var formatted = new Date(yyyy, mm, dd);
            if (effectiveDateAttr.getValue().getTime() !== formatted.getTime()) {
                effectiveDateAttr.setValue(formatted);
            }

            // Block future dates
            var now = new Date();
            var todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            if (selectedDate > todayEnd) {
                formContext.ui.setFormNotification(
                    "Effective Date cannot be a future date.",
                    "ERROR",
                    "effectivedate_future"
                );
                effectiveDateAttr.controls.forEach(function (ctrl) {
                    ctrl.setNotification("Effective Date cannot be in the future.");
                });
            } else {
                formContext.ui.clearFormNotification("effectivedate_future");
                effectiveDateAttr.controls.forEach(function (ctrl) {
                    ctrl.clearNotification();
                });
            }
        }
    });
};

// ----------------------------------------------------------------
// Start Date Auto-Format Handler
// Reusable handler for the cw_startdate field.
// Auto-formats raw numeric input (e.g. 10101998) to MM/DD/YYYY.
// ----------------------------------------------------------------

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
                // Only auto-format unambiguous 8-digit input (MMDDYYYY).
                // 7-digit input is ambiguous (e.g. "1231994" could be
                // 1/23/1994 or 12/3/1994), so we leave it for the user to clarify.
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


CW.PhoneNumber.Main = CW.PhoneNumber.Main || (function () {
    "use strict";

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
        formatPhoneNumber(executionContext);
        setNameField(executionContext);
        if (window.CW.effectiveDateHandler) {
            window.CW.effectiveDateHandler(formContext);
        }
        if (window.CW.startDateHandler) {
            window.CW.startDateHandler(formContext);
        }
    }

    async function onSave(executionContext) {
        const PHONE_ENTITY = "cw_personphonenumber";
        const LOOKUP_TO_CONTACT = "cw_person";
        const IS_PRIMARY = "cw_primaryphonenumber";

        const formContext = executionContext.getFormContext();
        if (formContext._popupHandled) return;
        if (formContext.ui.getFormType() !== 1) return;

        const contactRef = formContext.getAttribute(LOOKUP_TO_CONTACT)?.getValue();
        const contactId = contactRef[0].id.replace("{", "").replace("}", "");

        let isPrimary = formContext.getAttribute(IS_PRIMARY)?.getValue() ?? "471560000";
        const lookupWebApiName = "_" + LOOKUP_TO_CONTACT.toLowerCase() + "_value";

        const query =
            `?$select=${PHONE_ENTITY}id` +
            `&$filter=${lookupWebApiName} eq ${contactId}` +
            `&$top=1`;

        let existingCount = 0;
        let message = "";

        try {
            const resp = await Xrm.WebApi.retrieveMultipleRecords(PHONE_ENTITY, query);
            existingCount = resp?.entities?.length ?? 0;
            console.log("existingCount:" + existingCount);
        } catch (e) {
            console.error(e);
            return;
        }

        if (existingCount <= 0)
            message = "A primary phone number is required. This phone number will be set to primary because it is the only phone number on record."
        else
            message = "The phone number being added is not selected as the primary phone number."

        if (isPrimary === 471560000) {
            formContext._popupHandled = true;
            Xrm.Navigation.openAlertDialog({
                text: message
            });
        }
        formatPhoneNumber(executionContext);
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
        const personAttribute = formContext.getAttribute("cw_personid");
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
