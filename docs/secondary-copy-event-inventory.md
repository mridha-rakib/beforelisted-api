# Secondary-copy recipient and dispatch inventory

The list covers static `emailService.send...` call sites under API modules and jobs. Recipient roles describe the current caller and email method; dynamic addresses are resolved against active agent users and non-CRM profiles at send time. To, CC and BCC agents are eligible. A separately addressed copy is created even if the configured secondary is also in the primary envelope. Recipient classification is based on source inspection, not an end-to-end test of all 47 business entry points.

Each primary pipeline invocation has a fresh dispatch identity. A claim of the resulting stored intent is atomic, and uncertain or already claimed intents are not automatically resent. This does not deduplicate primary business operations and cannot guarantee exact parity when a primary provider timeout is accepted and the existing retry policy sends again.

| Call site | Method | Actual recipient role | Copy identity | Evidence |
|---|---|---|---|---|
| `src/modules/agent/agent.service.ts:682` | `sendAgentActivatedByAdminEmail` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/agent/agent.service.ts:827` | `sendAgentActivatedByAdminEmail` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/agent/agent.service.ts:1066` | `sendAgentAccountDeletedEmail` | Deleted agent To; saved profile snapshot | Per primary dispatch; business-event hint | Deletion email method: synthetic MongoDB test |
| `src/modules/agent/agent.service.ts:1154` | `sendRegisteredAgentNoLongerActiveToRenter` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/auth/auth.service.ts:448` | `sendAgentRegistrationVerifiedAdminNotification` | Admin To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/auth/auth.service.ts:541` | `sendRenterRegistrationVerifiedAdminNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch; business-event hint | Registration CC method tested |
| `src/modules/auth/auth.service.ts:567` | `sendWelcomeEmail` | To may be an agent, depending on account | Per primary dispatch | Agent welcome method tested |
| `src/modules/auth/auth.service.ts:593` | `sendMovingDiscountCodesEmail` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/auth/auth.service.ts:746` | `sendPasswordResetConfirmation` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/email-verification/email-verification.service.ts:87` | `sendEmailVerification` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/email-verification/email-verification.service.ts:118` | `sendEmailVerification` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/grant-access/grant-access.service.ts:988` | `sendRenterOpportunityFoundByRegisteredAgent` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/grant-access/grant-access.service.ts:1037` | `sendRenterOpportunityFoundByOtherAgent` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/password/password.service.ts:66` | `sendPasswordResetOTP` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market-notifier.ts:312` | `sendPreMarketRequestUpdatedNotificationToAgent` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market-notifier.ts:430` | `sendRenterRequestUpdatedByAdminNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market-notifier.ts:491` | `sendPreMarketNotificationToAdmin` | Admin To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market-notifier.ts:554` | `sendPreMarketRequestConfirmationToRenter` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market-notifier.ts:669` | `sendRenterRequestConfirmationToAgent` | Agent To; some methods also CC agents | Per primary dispatch; business-event hint | Request-confirmation method tested |
| `src/modules/pre-market/pre-market-notifier.ts:1109` | `sendGrantAccessRequestToAdmin` | Admin To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market-notifier.ts:1198` | `sendGrantAccessApprovalToAgent` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market-notifier.ts:1272` | `sendGrantAccessRejectionToAgent` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:2373` | `sendRenterRequestClosedAgentAlert` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:3521` | `sendRenterRequestClosedRenterNotification` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market.service.ts:3600` | `sendRenterRequestExpiredNotification` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market.service.ts:4561` | `sendRequestUpdateToMatchedAgent` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:4726` | `sendAgentUnmatchedNotification` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:4846` | `sendRenterSearchReactivatedAgentNotification` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:5417` | `sendActiveSearchConfirmationReminder` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:5514` | `sendUpcomingRequestSearchExpansionReminder` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market.service.ts:5640` | `sendRenterArchiveNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:5697` | `sendRenterUnarchiveNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:5878` | `sendRenterArchiveNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:5943` | `sendNonRegisteredAgentSharedRequestNotification` | Nonregistered-agent To; matching registered agent resolved if present | Per primary dispatch | Static method inspection |
| `src/modules/pre-market/pre-market.service.ts:8129` | `sendOwnerRepresentationMatchReferralAcknowledgment` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:8295` | `sendRenterOpportunityFoundByRegisteredAgent` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:8325` | `sendRenterOpportunityFoundByOtherAgent` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/pre-market/pre-market.service.ts:8350` | `sendMatchReferralAcknowledgmentToMatchingAgent` | Agent To; some methods also CC agents | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/renter/renter.service.ts:305` | `sendAdminReferralEmail` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/renter/renter.service.ts:328` | `sendRenterRegistrationVerifiedAdminNotification` | Agent CC when provided; registered-agent match may be CC | Per primary dispatch; business-event hint | Registration CC method tested |
| `src/modules/renter/renter.service.ts:365` | `sendWelcomeEmail` | To may be an agent, depending on account | Per primary dispatch | Agent welcome method tested |
| `src/modules/renter/renter.service.ts:515` | `sendMovingDiscountCodesEmail` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/renter/renter.service.ts:586` | `sendPasswordResetConfirmation` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |
| `src/modules/renter/renter.service.ts:692` | `sendRenterAccountDeletedEmail` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/support/support.service.ts:24` | `sendAdminContactRequest` | Admin To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/user/user.service.ts:339` | `sendRegisteredAgentNoLongerActiveToRenter` | Renter To; no agent recipient in current method | Per primary dispatch | Static method inspection |
| `src/modules/user/user.service.ts:419` | `sendPasswordChangedEmail` | To may be an agent, depending on account | Per primary dispatch | Shared path; individual business entry not tested here |

CRM registration is dispatched through its separate outbox, not the system-copy path. Agent targets for email methods whose primary recipient is an admin or renter depend on whether their actual To, CC or BCC lists include an agent; reply-to alone is not a recipient. The tests do not prove all business entry points individually.
