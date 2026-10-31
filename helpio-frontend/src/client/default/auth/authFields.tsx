import { Form, Input } from 'antd';
import { OTP_LENGTH } from '../../../common/CommonEnum';

/* Form fields shared by the log-in, sign-up and password layouts. Use inside an antd `Form`. */

const digitsOnly = (value: string | undefined) => (value ?? '').replace(/\D/g, '');

export const EmailField = ({ disabled = false }: { disabled?: boolean }) => (
  <Form.Item
    name="email"
    label="Email"
    rules={[
      { required: true, message: 'Enter your email' },
      { type: 'email', message: 'Enter a valid email' },
    ]}
  >
    <Input size="large" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" disabled={disabled} />
  </Form.Item>
);

export const NameField = () => (
  <Form.Item
    name="name"
    label="Full name"
    rules={[
      { required: true, whitespace: true, message: 'Enter your full name' },
      { min: 2, max: 80, message: 'Use 2 to 80 characters' },
    ]}
  >
    <Input size="large" autoComplete="name" placeholder="As on your ID" maxLength={80} />
  </Form.Item>
);

/** `new-password` when creating one, `current-password` when logging in (lets password managers help). */
export const PasswordField = ({
  autoComplete = 'new-password',
  label = 'Password',
}: {
  autoComplete?: 'new-password' | 'current-password';
  label?: string;
}) => (
  <Form.Item
    name="password"
    label={label}
    rules={[
      { required: true, message: 'Enter a password' },
      ...(autoComplete === 'new-password' ? [{ min: 8, message: 'Use at least 8 characters' }] : []),
      { max: 128, message: 'Use at most 128 characters' },
    ]}
  >
    <Input.Password
      size="large"
      autoComplete={autoComplete}
      placeholder={autoComplete === 'new-password' ? 'At least 8 characters' : 'Your password'}
      maxLength={128}
    />
  </Form.Item>
);

/** The emailed 6-digit code (sign-up and password reset) */
export const OtpField = () => (
  <Form.Item name="otp" label="Code" rules={[{ required: true, len: OTP_LENGTH, message: `Enter the ${OTP_LENGTH}-digit code` }]}>
    <Input.OTP
      length={OTP_LENGTH}
      size="large"
      formatter={(text) => text.replace(/\D/g, '')}
      autoComplete="one-time-code"
      inputMode="numeric"
      aria-label={`${OTP_LENGTH}-digit code`}
      className="!w-full !justify-between"
    />
  </Form.Item>
);

export const PhoneField = () => (
  <Form.Item
    name="phone"
    label="Mobile number"
    normalize={digitsOnly}
    rules={[
      { required: true, message: 'Enter your mobile number' },
      { pattern: /^[6-9]\d{9}$/, message: 'Enter a valid 10-digit mobile number' },
    ]}
  >
    <Input size="large" type="tel" inputMode="numeric" prefix="+91" maxLength={10} autoComplete="tel-national" placeholder="98765 43210" />
  </Form.Item>
);
