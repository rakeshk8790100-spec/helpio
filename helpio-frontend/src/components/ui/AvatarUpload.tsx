import { Spin } from 'antd';
import { Camera } from 'lucide-react';
import Avatar from './Avatar';

interface Props {
  name: string;
  src: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
}

/** Large avatar with a camera badge; tapping it picks a new photo. */
const AvatarUpload = ({ name, src, uploading, onPick }: Props) => (
  <label className={`relative inline-block shrink-0 ${uploading ? '' : 'cursor-pointer active:scale-95'}`}>
    <Avatar name={name} src={src} size="xl" />
    {uploading && (
      <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/60">
        <Spin size="small" />
      </span>
    )}
    <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white">
      <Camera size={14} />
    </span>
    <input
      type="file"
      accept="image/jpeg,image/png,image/webp"
      aria-label="Change profile photo"
      disabled={uploading}
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) onPick(file);
        e.target.value = '';
      }}
    />
  </label>
);

export default AvatarUpload;
