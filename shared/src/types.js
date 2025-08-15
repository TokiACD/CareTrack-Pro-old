"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationStatus = exports.InvitationType = exports.ShiftType = exports.ShiftApplicationStatus = exports.ShiftStatus = exports.PracticalRating = exports.CompetencySource = exports.CompetencyLevel = void 0;
var CompetencyLevel;
(function (CompetencyLevel) {
    CompetencyLevel["NOT_ASSESSED"] = "NOT_ASSESSED";
    CompetencyLevel["NOT_COMPETENT"] = "NOT_COMPETENT";
    CompetencyLevel["ADVANCED_BEGINNER"] = "ADVANCED_BEGINNER";
    CompetencyLevel["COMPETENT"] = "COMPETENT";
    CompetencyLevel["PROFICIENT"] = "PROFICIENT";
    CompetencyLevel["EXPERT"] = "EXPERT";
})(CompetencyLevel || (exports.CompetencyLevel = CompetencyLevel = {}));
var CompetencySource;
(function (CompetencySource) {
    CompetencySource["ASSESSMENT"] = "ASSESSMENT";
    CompetencySource["MANUAL"] = "MANUAL";
})(CompetencySource || (exports.CompetencySource = CompetencySource = {}));
var PracticalRating;
(function (PracticalRating) {
    PracticalRating["COMPETENT"] = "COMPETENT";
    PracticalRating["NEEDS_SUPPORT"] = "NEEDS_SUPPORT";
    PracticalRating["NOT_APPLICABLE"] = "NOT_APPLICABLE";
})(PracticalRating || (exports.PracticalRating = PracticalRating = {}));
var ShiftStatus;
(function (ShiftStatus) {
    ShiftStatus["PENDING"] = "PENDING";
    ShiftStatus["WAITING_RESPONSES"] = "WAITING_RESPONSES";
    ShiftStatus["HAS_APPLICATIONS"] = "HAS_APPLICATIONS";
    ShiftStatus["ASSIGNED"] = "ASSIGNED";
    ShiftStatus["CONFIRMED"] = "CONFIRMED";
    ShiftStatus["CANCELLED"] = "CANCELLED";
    ShiftStatus["COMPLETED"] = "COMPLETED";
    ShiftStatus["EXPIRED"] = "EXPIRED";
})(ShiftStatus || (exports.ShiftStatus = ShiftStatus = {}));
var ShiftApplicationStatus;
(function (ShiftApplicationStatus) {
    ShiftApplicationStatus["PENDING"] = "PENDING";
    ShiftApplicationStatus["SELECTED"] = "SELECTED";
    ShiftApplicationStatus["REJECTED"] = "REJECTED";
})(ShiftApplicationStatus || (exports.ShiftApplicationStatus = ShiftApplicationStatus = {}));
var ShiftType;
(function (ShiftType) {
    ShiftType["DAY"] = "DAY";
    ShiftType["NIGHT"] = "NIGHT";
})(ShiftType || (exports.ShiftType = ShiftType = {}));
var InvitationType;
(function (InvitationType) {
    InvitationType["ADMIN"] = "ADMIN";
    InvitationType["CARER"] = "CARER";
})(InvitationType || (exports.InvitationType = InvitationType = {}));
var InvitationStatus;
(function (InvitationStatus) {
    InvitationStatus["PENDING"] = "PENDING";
    InvitationStatus["ACCEPTED"] = "ACCEPTED";
    InvitationStatus["DECLINED"] = "DECLINED";
    InvitationStatus["EXPIRED"] = "EXPIRED";
})(InvitationStatus || (exports.InvitationStatus = InvitationStatus = {}));
//# sourceMappingURL=types.js.map