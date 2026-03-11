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
    var EFFECTIVE_DATE_FIELD = "cr_effectivedate"; // <-- Change prefix (cr_) to your publisher prefix

    // Set to true if your Effective Date field uses "Time Zone Independent"
    // behavior AND you are on CRM 9.1 on-premises (known bug where dates
    // display one day behind). This adds the UTC offset to compensate.
    // Reference: https://community.dynamics.com/blogs/post/?postid=ec5303b1-2541-4897-b82b-50515dd3da13
    var APPLY_TIMEZONE_FIX = false; // <-- Set to true if affected by the TZ Independent bug

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
