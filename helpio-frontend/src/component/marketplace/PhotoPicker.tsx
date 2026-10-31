import { Spin } from 'antd';
import { CircleAlert, ImagePlus, Video, X } from 'lucide-react';

export interface PhotoItem {
  id: string;
  /** Preview (local object URL while uploading, signed URL once saved) */
  url: string;
  isVideo: boolean;
  uploading: boolean;
  error?: string;
}

interface Props {
  items: PhotoItem[];
  max: number;
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4';

/** Up to `max` photos or short videos as a 3-column thumbnail grid, with an add tile and remove buttons. */
const PhotoPicker = ({ items, max, onAdd, onRemove, disabled = false }: Props) => (
  <div className="grid grid-cols-3 gap-2">
    {items.map((item) => (
      <div key={item.id} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
        {item.isVideo ? (
          <div className="flex h-full items-center justify-center text-slate-500">
            <Video size={24} />
          </div>
        ) : (
          <img src={item.url} alt="Job photo" className="h-full w-full object-cover" />
        )}
        {item.uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Spin size="small" />
          </div>
        )}
        {item.error && (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-red-600/90 px-1.5 py-1 text-[10px] text-white">
            <CircleAlert size={11} />
            {item.error}
          </div>
        )}
        {!item.uploading && (
          <button
            type="button"
            aria-label="Remove photo"
            onClick={() => onRemove(item.id)}
            className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/70 text-white active:scale-95"
          >
            <X size={14} />
          </button>
        )}
      </div>
    ))}
    {items.length < max && (
      <label
        className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 ${
          disabled ? 'opacity-50' : 'cursor-pointer active:scale-95'
        }`}
      >
        <ImagePlus size={20} />
        Add photo
        <span className="text-[10px] text-slate-400">
          {items.length}/{max}
        </span>
        <input
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </label>
    )}
  </div>
);

export default PhotoPicker;
