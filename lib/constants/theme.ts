import { DESIGN_TOKENS as t } from "../design-tokens";

export const APP_THEME = {
  token: {
    colorPrimary: t.color.primary,
    colorPrimaryHover: t.color.primaryHover,
    colorPrimaryActive: t.color.primaryActive,
    colorInfo: t.color.info,
    colorSuccess: t.color.success,
    colorWarning: t.color.warning,
    colorError: t.color.error,
    colorText: t.color.text,
    colorTextSecondary: t.color.textSecondary,
    colorTextDescription: t.color.textSecondary,
    colorTextTertiary: t.color.textSecondary,
    colorTextPlaceholder: t.color.textSecondary,
    colorBorder: t.color.controlBorder,
    colorBgLayout: t.color.background,
    colorBgContainer: t.color.surface,
    borderRadius: t.radius.control,
    borderRadiusLG: t.radius.card,
    borderRadiusSM: t.radius.small,
    controlHeight: t.control.patientMin,
    fontSize: t.font.bodyStaff.size,
    fontSizeSM: t.font.meta.size,
    fontSizeHeading1: t.font.h1.size,
    fontSizeHeading2: t.font.h2.size,
    fontSizeHeading3: t.font.h3.size,
    fontFamily: "var(--font-body)",
    padding: t.component.padding,
    paddingSM: t.component.paddingSmall,
    paddingLG: t.component.paddingLarge,
  },
};
export const STAFF_THEME = { token: { controlHeight: t.control.staffDesktopMin } };
export const PATIENT_THEME = {
  token: { fontSize: t.font.bodyPatient.size, controlHeight: t.control.patientMin },
};

export const STAT_TONE_STYLES = {
  indigo: { icon: "bg-indigo-50 text-indigo-500", detail: "text-indigo-600" },
  emerald: { icon: "bg-emerald-50 text-emerald-500", detail: "text-emerald-600" },
  amber: { icon: "bg-amber-50 text-amber-500", detail: "text-amber-600" },
  violet: { icon: "bg-violet-50 text-violet-500", detail: "text-violet-600" },
};

export const CLINICAL_INPUT_CLASS_NAME =
  "w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20";
