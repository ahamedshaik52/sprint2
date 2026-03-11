using System;
using System.Linq;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Metadata;

namespace PhoneNumber.Plugins
{
    /// <summary>
    /// Retrieve Plugin (Post-Operation) to fix the known CRM 9.1 on-premises bug
    /// where DateTime fields with "Time Zone Independent" behavior display
    /// the wrong date (typically one day behind the actual value).
    ///
    /// Reference: https://community.dynamics.com/blogs/post/?postid=ec5303b1-2541-4897-b82b-50515dd3da13
    ///
    /// Register this plugin on:
    ///   Message:  Retrieve
    ///   Entity:   Your phone number entity logical name (e.g., cr_phonenumber)
    ///   Stage:    Post-Operation (40)
    ///   Mode:     Synchronous
    /// </summary>
    public class FixTimeZoneIndependentDatetime : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            var context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            var serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            var service = serviceFactory.CreateOrganizationService(context.UserId);
            var tracingService = (ITracingService)serviceProvider.GetService(typeof(ITracingService));

            try
            {
                if (context.MessageName != "Retrieve" || context.Stage != 40)
                    return;

                // Get the entity from the output parameters
                if (!context.OutputParameters.Contains("BusinessEntity"))
                    return;

                var entity = (Entity)context.OutputParameters["BusinessEntity"];

                // Get entity metadata to identify Time Zone Independent fields
                var metadataRequest = new RetrieveEntityRequest
                {
                    LogicalName = entity.LogicalName,
                    EntityFilters = EntityFilters.Attributes,
                    RetrieveAsIfPublished = true
                };

                var metadataResponse = (RetrieveEntityResponse)service.Execute(metadataRequest);
                var entityMetadata = metadataResponse.EntityMetadata;

                // Fix each Time Zone Independent DateTime field
                CorrectTimeZoneIndependentFields(entity, entityMetadata, context, tracingService);
            }
            catch (Exception ex)
            {
                tracingService.Trace("FixTimeZoneIndependentDatetime error: {0}", ex.Message);
                throw new InvalidPluginExecutionException(
                    "An error occurred in the FixTimeZoneIndependentDatetime plugin.", ex);
            }
        }

        /// <summary>
        /// Iterates through all DateTime attributes with TimeZoneIndependent behavior
        /// and adds the user's UTC offset to correct the displayed value.
        /// </summary>
        private void CorrectTimeZoneIndependentFields(
            Entity entity,
            EntityMetadata entityMetadata,
            IPluginExecutionContext context,
            ITracingService tracingService)
        {
            foreach (var attribute in entityMetadata.Attributes)
            {
                // Skip if the entity doesn't contain this attribute or it's not DateTime
                if (!entity.Contains(attribute.LogicalName))
                    continue;

                if (attribute.AttributeType != AttributeTypeCode.DateTime)
                    continue;

                var dateTimeAttr = attribute as DateTimeAttributeMetadata;
                if (dateTimeAttr == null)
                    continue;

                // Only fix Time Zone Independent fields
                if (dateTimeAttr.DateTimeBehavior != DateTimeBehavior.TimeZoneIndependent)
                    continue;

                var currentValue = entity.GetAttributeValue<DateTime?>(attribute.LogicalName);
                if (!currentValue.HasValue)
                    continue;

                // Get the user's UTC offset and add it back to correct the display
                // The bug causes the value to be shifted by the user's timezone offset
                var utcOffset = TimeZoneInfo.Local.GetUtcOffset(currentValue.Value);
                var correctedValue = currentValue.Value.Add(utcOffset);

                entity[attribute.LogicalName] = correctedValue;

                tracingService.Trace(
                    "Corrected field '{0}': {1} -> {2} (offset: {3})",
                    attribute.LogicalName,
                    currentValue.Value,
                    correctedValue,
                    utcOffset);
            }
        }
    }
}
