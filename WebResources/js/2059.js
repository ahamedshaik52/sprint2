// ============================================================
// 2059.js — Phone Number Quick Create Form
// ============================================================
// Handles: Phone formatting, name field, primary phone check,
//          and Effective Date auto-population with current date.
// Entity:  cw_personphonenumber (sub-grid on Person table form)
// Form:    Quick Create Form
// Events:  OnLoad, OnSave
// ============================================================

window.CW = window.CW || {};
CW.PhoneNumber = CW.PhoneNumber || {};

// ----------------------------------------------------------------
// Effective Date Handler
// Auto-populates the Effective Date field with the current system
// date when the quick create form loads. User can override the date.
// ----------------------------------------------------------------
// Set to true if affected by the CRM 9.1 on-premises Time Zone
// Independent bug (date displays one day behind).
// Ref: https://community.dynamics.com/blogs/post/?postid=ec5303b1-2541-4897-b82b-50515dd3da13
// ----------------------------------------------------------------
var APPLY_TIMEZONE_FIX = true;

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

    // Only set the date if the field is currently empty (new record)
    var currentValue = effectiveDateAttr.getValue();
    if (currentValue === null || currentValue === undefined) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        // CRM 9.1 on-premises bug fix: compensate for incorrect UTC offset subtraction
        if (APPLY_TIMEZONE_FIX) {
            var offsetMinutes = today.getTimezoneOffset();
            today.setMinutes(today.getMinutes() + offsetMinutes);
        }

        effectiveDateAttr.setValue(today);
        effectiveDateAttr.fireOnChange();
    }
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
