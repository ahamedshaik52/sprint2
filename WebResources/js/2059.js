// ============================================================
// Phone Number Quick Create Form - Effective Date Auto-Population
// ============================================================
// Purpose: Auto-populates the Effective Date field with the
//          current system date when the Phone Number quick
//          create form loads. Users can override the date.
// ============================================================
// Entity: Phone Number (sub-grid on Person table form)
// Form:   Quick Create Form
// Event:  Form OnLoad
// ============================================================

var PhoneNumber = PhoneNumber || {};

PhoneNumber.QuickCreate = (function () {
    "use strict";

    // --------------------------------------------------------
    // CONFIGURATION
    // Update the logical name below to match your environment.
    // --------------------------------------------------------
    var EFFECTIVE_DATE_FIELD = "new_effectivedate"; // <-- Change prefix (cr_) to your publisher prefix

    // Set to true if your Effective Date field uses "Time Zone Independent"
    // behavior AND you are on CRM 9.1 on-premises (known bug where dates
    // display one day behind). This adds the UTC offset to compensate.
    // Reference: https://community.dynamics.com/blogs/post/?postid=ec5303b1-2541-4897-b82b-50515dd3da13
    var APPLY_TIMEZONE_FIX = true; // <-- Set to true if affected by the TZ Independent bug

    /**
     * Form OnLoad handler.
     * Sets the Effective Date field to today's date if it is empty.
     *
     * @param {Object} executionContext - The execution context passed by the form event.
     */
    function onLoad(executionContext) {
        var formContext = executionContext.getFormContext();

        try {
            setEffectiveDateToToday(formContext);
        } catch (e) {
            console.error("PhoneNumber.QuickCreate.onLoad error: " + e.message);
        }
    }

    /**
     * Sets the Effective Date field to the current system date
     * only if the field is currently empty (null).
     * This allows users to change the date after it is populated.
     *
     * @param {Object} formContext - The form context.
     */
    function setEffectiveDateToToday(formContext) {
        var effectiveDateAttr = formContext.getAttribute(EFFECTIVE_DATE_FIELD);

        if (effectiveDateAttr === null || effectiveDateAttr === undefined) {
            console.warn(
                "PhoneNumber.QuickCreate: Field '" +
                    EFFECTIVE_DATE_FIELD +
                    "' not found on the form. " +
                    "Verify the logical name matches your environment."
            );
            return;
        }

        // Only set the date if the field is currently empty
        var currentValue = effectiveDateAttr.getValue();
        if (currentValue === null || currentValue === undefined) {
            var today = new Date();
            // Reset time to start of day to store date-only
            today.setHours(0, 0, 0, 0);

            // CRM 9.1 on-premises bug fix: When the Effective Date field uses
            // "Time Zone Independent" behavior, CRM incorrectly subtracts the
            // user's UTC offset, causing the date to display one day behind.
            // Adding the offset back compensates for this bug.
            if (APPLY_TIMEZONE_FIX) {
                var offsetMinutes = today.getTimezoneOffset(); // negative for ahead of UTC
                today.setMinutes(today.getMinutes() - offsetMinutes);
            }

            effectiveDateAttr.setValue(today);

            // Fire OnChange to trigger any dependent business rules
            effectiveDateAttr.fireOnChange();
        }
    }

    // Public API
    return {
        onLoad: onLoad
    };
})();


/////////////////////////

window.CW = window.CW || {};
CW.PhoneNumber = CW.PhoneNumber || {};


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
