import { Alert, Button } from 'antd';
import { CircleCheck, LocateFixed } from 'lucide-react';
import type { Coordinates } from '../../common/CommonDto';

interface Props {
  coordinates: Coordinates | null;
  locating: boolean;
  error?: string;
  onLocate: () => void;
  onClear: () => void;
}

/** "Use my current location", or a confirmation with Remove once it's added. Errors suggest the pincode instead. */
const CurrentLocationButton = ({ coordinates, locating, error, onLocate, onClear }: Props) => (
  <>
    {coordinates ? (
      <div className="mb-3 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <span className="flex items-center gap-2">
          <CircleCheck size={16} />
          Current location added
        </span>
        <button type="button" onClick={onClear} className="font-medium text-slate-600">
          Remove
        </button>
      </div>
    ) : (
      <Button size="large" block icon={<LocateFixed size={16} />} loading={locating} onClick={onLocate} className="!mb-3">
        Use my current location
      </Button>
    )}
    {error && <Alert type="warning" showIcon title={error} className="!mb-3" />}
  </>
);

export default CurrentLocationButton;
