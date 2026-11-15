import { Circle, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapCircle } from '../../common/CommonDto';

/* Leaflet draws SVG paths; Tailwind stroke/fill classes override its default colour attributes */
const AREA_STYLE = { className: 'stroke-indigo-500 fill-indigo-500', weight: 1, fillOpacity: 0.05, dashArray: '4 4' };
const JOB_STYLE = { className: 'stroke-amber-500 fill-amber-500', weight: 1.5, fillOpacity: 0.25 };
const URGENT_STYLE = { className: 'stroke-red-500 fill-red-500', weight: 1.5, fillOpacity: 0.25 };

export interface JobMapItem {
  id: string;
  title: string;
  /** e.g. "~2.5 km · ₹500" */
  meta: string;
  circle: MapCircle;
  urgent: boolean;
  onOpen: () => void;
}

interface Props {
  /** The provider's travel area; the map centres on it */
  area: MapCircle | null;
  jobs: JobMapItem[];
  /** Fallback centre when there's no area (e.g. a single job) */
  center?: MapCircle;
  height?: number;
}

/**
 * OpenStreetMap view with approximate circles only: never an exact pin before hire.
 * Each job circle opens a small popup with a link to the job.
 */
const JobMap = ({ area, jobs, center, height = 360 }: Props) => {
  const focus = area ?? center ?? jobs[0]?.circle;
  if (!focus) return null;
  // Zoom so the provider's radius (or a job circle) fits a 430px-wide screen
  const zoom = Math.max(10, Math.min(15, Math.round(15 - Math.log2(focus.radiusM / 600))));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100" style={{ height }}>
      <MapContainer center={[focus.latitude, focus.longitude]} zoom={zoom} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {area && <Circle center={[area.latitude, area.longitude]} radius={area.radiusM} pathOptions={AREA_STYLE} />}
        {jobs.map((job) => (
          <Circle
            key={job.id}
            center={[job.circle.latitude, job.circle.longitude]}
            radius={job.circle.radiusM}
            pathOptions={job.urgent ? URGENT_STYLE : JOB_STYLE}
          >
            <Popup>
              <div className="min-w-40">
                <div className="text-sm font-semibold text-slate-900">{job.title}</div>
                <div className="mt-0.5 text-xs text-slate-500">{job.meta}</div>
                <button type="button" onClick={job.onOpen} className="mt-2 text-xs font-semibold text-indigo-600">
                  View and quote →
                </button>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default JobMap;
