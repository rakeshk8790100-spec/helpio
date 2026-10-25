interface Props {
  title: string;
  subtitle: string;
  /** Provider pages carry the amber "For professionals" eyebrow */
  forProfessionals?: boolean;
}

/** Title block at the top of every log-in, sign-up and password page. The app header shows the logo. */
const AuthHeader = ({ title, subtitle, forProfessionals = false }: Props) => (
  <div>
    {forProfessionals && (
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-600">For professionals</div>
    )}
    <div className="text-2xl font-bold text-slate-900">{title}</div>
    <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
  </div>
);

export default AuthHeader;
