import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, Form } from 'antd';
import type { PostJobFormValues, PostJobLayoutProps } from '../client/default/jobs/jobs.layout.types';
import { useGetSkillCatalogQuery } from '../common/CommonApi';
import type { JobDetail } from '../common/CommonDto';
import type { PhotoItem } from '../component/marketplace';
import { RouterKeys, toPath } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import { draftJobDescription } from '../lib/utils';
import {
  useAddAttachmentMutation,
  useCreateJobMutation,
  useDeleteAttachmentMutation,
  useGetJobQuery,
  useUpdateJobMutation,
} from '../pages/jobs/jobs.api';
import type { JobInput } from '../pages/jobs/types/jobs.dto';
import { useCurrentLocation } from './useCurrentLocation';

const MAX_PHOTOS = 6;
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

/** ISO date-time → "YYYY-MM-DDTHH:mm" in local time, for a datetime-local input */
const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const fromDraft = (job: JobDetail | undefined, params: URLSearchParams): Partial<PostJobFormValues> => ({
  title: job?.title ?? params.get('title') ?? '',
  description: job?.description ?? params.get('description') ?? undefined,
  categoryId: job?.categoryId ?? params.get('category') ?? undefined,
  pincode: job?.pincode ?? undefined,
  areaName: job?.areaName ?? undefined,
  when: job?.scheduledAt ? toLocalInput(job.scheduledAt) : undefined,
  durationMins: job?.durationMins ?? undefined,
  budget: job?.budget ?? undefined,
  isEmergency: job?.isEmergency ?? params.get('emergency') === '1',
});

/** Fields a posted job needs (a draft only needs a title), with the message shown under each. */
const REQUIRED_TO_POST: [keyof PostJobFormValues, string][] = [
  ['description', 'Describe the job so pros can quote'],
  ['categoryId', 'Pick a category'],
  ['pincode', 'Enter the pincode'],
  ['areaName', 'Enter the area or locality'],
];

/**
 * /jobs/new: post a custom job, or save it as a draft to continue later (`?draft=<id>`). Prefills from
 * `?title=`, `?description=`, `?category=` and `?emergency=1`. Photos need a saved draft, so adding the
 * first one saves it.
 */
export const usePostJob = (): PostJobLayoutProps => {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [params] = useSearchParams();
  // Read once: later saves don't change the URL, so the form never reloads under the customer
  const [initialDraftId] = useState(() => params.get('draft'));
  const [jobId, setJobId] = useState<string | null>(initialDraftId);
  const draft = useGetJobQuery(initialDraftId ?? '', { skip: !initialDraftId });
  const catalog = useGetSkillCatalogQuery();
  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [addAttachment] = useAddAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const [form] = Form.useForm<PostJobFormValues>();
  const location = useCurrentLocation(draft.data?.coordinates ?? null);
  const [saving, setSaving] = useState<'draft' | 'post' | null>(null);
  const [error, setError] = useState<string>();
  // Photos added on this screen; saved draft photos come from the server
  const [uploads, setUploads] = useState<PhotoItem[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);

  if (catalog.isLoading || (initialDraftId && draft.isLoading)) return { loading: true };

  const uploadIds = new Set(uploads.map((item) => item.id));
  const saved: PhotoItem[] = (draft.data?.attachments ?? [])
    .filter((item) => !removed.includes(item.id) && !uploadIds.has(item.id))
    .map((item) => ({ id: item.id, url: item.url, isVideo: item.contentType.startsWith('video/'), uploading: false }));
  const photos = [...saved, ...uploads];

  const toInput = (values: PostJobFormValues, submit: boolean): JobInput & { title: string } => ({
    title: values.title.trim(),
    description: values.description?.trim() || null,
    categoryId: values.categoryId ?? null,
    coordinates: location.coordinates,
    pincode: values.pincode || null,
    areaName: values.areaName?.trim() || null,
    budget: values.budget ?? null,
    scheduledAt: values.when ? new Date(values.when).toISOString() : null,
    durationMins: values.durationMins ?? null,
    isEmergency: Boolean(values.isEmergency),
    submit,
  });

  const persist = async (submit: boolean) => {
    const input = toInput(form.getFieldsValue(true), submit);
    const job = jobId ? await updateJob({ id: jobId, ...input }).unwrap() : await createJob(input).unwrap();
    setJobId(job.id);
    return job.id;
  };

  const save = async (submit: boolean) => {
    setError(undefined);
    try {
      await form.validateFields(['title']);
    } catch {
      return;
    }
    if (submit) {
      const values = form.getFieldsValue(true);
      const missing = REQUIRED_TO_POST.filter(([name]) => !String(values[name] ?? '').trim());
      if (missing.length) {
        form.setFields(missing.map(([name, text]) => ({ name, errors: [text] })));
        form.scrollToField(missing[0][0]);
        return;
      }
      if (photos.some((item) => item.uploading)) {
        setError('Wait for your photos to finish uploading.');
        return;
      }
    }
    setSaving(submit ? 'post' : 'draft');
    try {
      const id = await persist(submit);
      if (submit) {
        message.success('Job posted. Pros nearby can now send quotes.');
        navigate(toPath(RouterKeys.JOB_DETAIL, { id }), { replace: true });
      } else {
        message.success('Draft saved. Continue any time from My jobs.');
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  /** Photos attach to a saved job; the first photo saves a draft (it needs a title). */
  const ensureJob = async () => {
    if (jobId) return jobId;
    try {
      await form.validateFields(['title']);
    } catch {
      message.info('Add a short title first, then your photos.');
      return null;
    }
    try {
      return await persist(false);
    } catch (e) {
      setError(apiErrorMessage(e));
      return null;
    }
  };

  const upload = async (id: string, file: File) => {
    const tempId = crypto.randomUUID();
    const mark = (patch: Partial<PhotoItem>) =>
      setUploads((items) => items.map((item) => (item.id === tempId ? { ...item, ...patch } : item)));
    setUploads((items) => [
      ...items,
      { id: tempId, url: URL.createObjectURL(file), isVideo: file.type.startsWith('video/'), uploading: true },
    ]);
    try {
      const saved = await addAttachment({ jobId: id, file }).unwrap();
      mark({ id: saved.id, url: saved.url, uploading: false });
    } catch (e) {
      mark({ uploading: false, error: apiErrorMessage(e).length > 40 ? 'Upload failed' : apiErrorMessage(e) });
    }
  };

  return {
    loading: false,
    editingDraft: Boolean(initialDraftId),
    form,
    initialValues: fromDraft(draft.data, params),
    categories: (catalog.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    location,
    onImprove: () => {
      const text = form.getFieldValue('description') || form.getFieldValue('title') || '';
      if (!String(text).trim()) {
        message.info('Write a few words first, then improve them.');
        return;
      }
      form.setFieldValue('description', draftJobDescription(String(text)));
    },
    photos: {
      items: photos,
      max: MAX_PHOTOS,
      disabled: saving !== null,
      onAdd: async (files) => {
        const room = MAX_PHOTOS - photos.length;
        if (files.length > room) message.warning(`Up to ${MAX_PHOTOS} photos or videos per job.`);
        const accepted = files.slice(0, Math.max(room, 0)).filter((file) => {
          if (!TYPES.includes(file.type)) message.error(`${file.name}: use JPG, PNG, WebP or MP4.`);
          else if (file.size > MAX_BYTES) message.error(`${file.name} is over 10 MB.`);
          else return true;
          return false;
        });
        if (!accepted.length) return;
        const id = await ensureJob();
        if (id) await Promise.all(accepted.map((file) => upload(id, file)));
      },
      onRemove: async (photoId) => {
        const local = uploads.find((item) => item.id === photoId);
        if (local?.error || !jobId) {
          setUploads((items) => items.filter((item) => item.id !== photoId));
          return;
        }
        try {
          await deleteAttachment({ jobId, attachmentId: photoId }).unwrap();
          setUploads((items) => items.filter((item) => item.id !== photoId));
          setRemoved((ids) => [...ids, photoId]);
        } catch (e) {
          message.error(apiErrorMessage(e));
        }
      },
    },
    saving,
    error,
    onSaveDraft: () => void save(false),
    onPost: () => void save(true),
  };
};
