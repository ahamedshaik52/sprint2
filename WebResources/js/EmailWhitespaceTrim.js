"use strict";

var EmailWhitespaceTrim = EmailWhitespaceTrim || {};

/**
 * Called on the Quick Create form's OnLoad event.
 * Registers both OnChange and OnBlur handlers on the email field so that
 * leading/trailing whitespace is always stripped — even when the platform
 * silently ignores the change (e.g. user only adds spaces).
 *
 * @param {Xrm.Events.EventContext} executionContext
 */
EmailWhitespaceTrim.onFormLoad = function (executionContext) {
    var formContext = executionContext.getFormContext();
    var emailField = formContext.getAttribute("emailaddress1");

    if (!emailField) {
        return;
    }

    // OnChange fires when an actual character changes.  Trim here so the
    // value is clean before save in the normal editing flow.
    emailField.addOnChange(function (ctx) {
        EmailWhitespaceTrim._trimEmailField(ctx.getFormContext(), "emailaddress1");
    });

    // OnBlur fires every time the user leaves the field — including the
    // "spaces only" case where OnChange is suppressed.  Calling setValue
    // with the trimmed value forces the control to re-render and removes
    // the visible whitespace even when Dataverse considers the value
    // unchanged.
    var control = formContext.getControl("emailaddress1");
    if (control && typeof control.addOnOutputChange === "function") {
        // UCI-specific blur hook (available in some versions)
        control.addOnOutputChange(function () {
            EmailWhitespaceTrim._trimEmailField(formContext, "emailaddress1");
        });
    }

    // Universal fallback: attach a native blur listener directly on the
    // underlying <input> element via a small MutationObserver so we do not
    // depend on the UCI control being fully rendered at OnLoad time.
    EmailWhitespaceTrim._attachNativeBlur(formContext, "emailaddress1");
};

/**
 * Called on the form's OnSave event.
 * Final safety net — trims the email field immediately before the record
 * is persisted so even if blur was never triggered the saved value is clean.
 *
 * @param {Xrm.Events.EventContext} executionContext
 */
EmailWhitespaceTrim.onFormSave = function (executionContext) {
    var formContext = executionContext.getFormContext();
    EmailWhitespaceTrim._trimEmailField(formContext, "emailaddress1");
};

/**
 * Trims the value of the named attribute and writes it back via setValue
 * so the control display refreshes immediately.
 *
 * @param {Xrm.FormContext} formContext
 * @param {string} attributeName
 */
EmailWhitespaceTrim._trimEmailField = function (formContext, attributeName) {
    var attr = formContext.getAttribute(attributeName);
    if (!attr) { return; }

    var raw = attr.getValue();
    if (typeof raw !== "string") { return; }

    var trimmed = raw.trim();

    // Always call setValue — even when the trimmed value equals the stored
    // value — because this is what forces the input element to drop any
    // leading/trailing whitespace that is still visible in the UI.
    attr.setValue(trimmed);
};

/**
 * Attaches a native DOM blur listener on the <input> that backs the
 * named control.  Uses a MutationObserver to wait for the element to
 * appear in the DOM (Quick Create forms render asynchronously).
 *
 * @param {Xrm.FormContext} formContext
 * @param {string} controlName
 */
EmailWhitespaceTrim._attachNativeBlur = function (formContext, controlName) {
    var SELECTOR = "input[id*='" + controlName + "']"

    var tryAttach = function () {
        var input = document.querySelector(SELECTOR);
        if (input) {
            input.addEventListener("blur", function () {
                EmailWhitespaceTrim._trimEmailField(formContext, controlName);
            });
            return true;
        }
        return false;
    };

    if (tryAttach()) { return; }

    // Element not yet in DOM — observe until it appears.
    var observer = new MutationObserver(function (mutations, obs) {
        if (tryAttach()) {
            obs.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
};
