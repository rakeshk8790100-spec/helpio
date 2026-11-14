import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import { App, Form } from 'antd';
import { WhenDay, WhenSlot } from '../client/default/jobs/jobs.layout.types';
import type { PostJobFormValues, PostJobLayoutProps, PostJobMode } from '../client/default/jobs/jobs.layout.types';
import { useGetSkillCatalogQuery } from '../common/CommonApi';
import type { JobDetail } from '../common/CommonDto';
import { JobStatus } from '../common/CommonEnum';
import type { PhotoItem } from '../component/marketplace';
import type { ChipOption } from '../component/ui';
import { RouterKeys, toPath } from '../config/router/RouterKeys';
import { apiErrorMessage } from '../lib/apiError';
import {
  useAddAttachmentMutation,
  useAssistJobMutation,
  useCreateJobMutation,
  useDeleteAttachmentMutation,
  useDeleteJobMutation,
  useGetJobQuery,
  useInviteProviderMutation,
  useUpdateJobMutation,
} from '../pages/jobs/jobs.api';
import type { JobDraftSuggestion, JobInput } from '../pages/jobs/types/jobs.dto';
import { useGetAddressesQuery } from '../pages/profile/profile.api';
import { useGetProviderQuery } from '../pages/pros/pros.api';
import { useCurrentLocation } from './useCurrentLocation';

const MAX_PHOTOS = 6;
const ADDRESS_LABEL = { home: 'Home', work: 'Work', other: 'Other' };
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: string[] = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

/** Each time-of-day choice starts at this hour */
const SLOT_HOURS: Record<WhenSlot, number> = { morning: 9, afternoon: 13, evening: 17 };
const SLOT_LABELS: Record<WhenSlot, string> = { morning: 'Morning 9 AM', afternoon: 'Afternoon 1 PM', evening: 'Evening 5 PM' };
const SLOTS = [WhenSlot.MORNING, WhenSlot.AFTERNOON, WhenSlot.EVENING];
// An unrounded time this close to now was "as soon as possible"
const ASAP_WINDOW_MS = 3 * 60 * 60_000;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar day "YYYY-MM-DD" */
const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
/** Today's slots that haven't started yet */
const slotsLeftToday = () => SLOTS.filter((slot) => SLOT_HOURS[slot] > new Date().getHours());

/** The form's day and slot → ISO date-time; nothing picked means flexible (null) */
const toSchedule = ({ whenDay, whenDate, whenSlot }: PostJobFormValues): string | null => {
  if (!whenDay) return null;
  if (whenDay === WhenDay.ASAP) return new Date().toISOString();
  const now = new Date();
  const day = whenDay === WhenDay.TODAY ? now : whenDay === WhenDay.TOMORROW ? addDays(now, 1) : whenDate ? new Date(`${whenDate}T00:00`) : null;
  if (!day) return null;
  day.setHours(SLOT_HOURS[whenSlot ?? WhenSlot.MORNING], 0, 0, 0);
  return day.toISOString();
};

/** A saved time → the form's day and slot. A time that has passed is dropped, so the customer picks again. */
const fromSchedule = (iso: string | null): Partial<PostJobFormValues> => {
  if (!iso) return {};
  const date = new Date(iso);
  const now = new Date();
  if (date.getTime() < now.getTime() - 5 * 60_000) return {};
  const onSlot = date.getMinutes() === 0 && Object.values(SLOT_HOURS).includes(date.getHours());
  if (!onSlot && date.getTime() - now.getTime() < ASAP_WINDOW_MS) return { whenDay: WhenDay.ASAP };
  const hour = date.getHours();
  const whenSlot = hour < 12 ? WhenSlot.MORNING : hour < 16 ? WhenSlot.AFTERNOON : WhenSlot.EVENING;
  const day = localDay(date);
  if (day === localDay(now)) return { whenDay: WhenDay.TODAY, whenSlot };
  if (day === localDay(addDays(now, 1))) return { whenDay: WhenDay.TOMORROW, whenSlot };
  return { whenDay: WhenDay.DATE, whenDate: day, whenSlot };
};

const fromDraft = (job: JobDetail | undefined, params: URLSearchParams): Partial<PostJobFormValues> => ({
  title: job?.title ?? undefined,
  description: job?.description ?? undefined,
  categoryId: job?.categoryId ?? params.get('category') ?? undefined,
  pincode: job?.pincode ?? undefined,
  areaName: job?.areaName ?? undefined,
  addressLine: job?.addressLine ?? undefined,
  ...fromSchedule(job?.scheduledAt ?? null),
  durationMins: job?.durationMins ?? undefined,
  budget: job?.budget ?? undefined,
  isEmergency: job?.isEmergency ?? params.get('emergency') === '1',
});

/** The assistant's draft → form values; a category the customer already chose (from search or a pro) wins */
const fromSuggestion = (s: JobDraftSuggestion, presetCategory: string | null): Partial<PostJobFormValues> => ({
  title: s.title,
  description: s.description,
  categoryId: presetCategory ?? s.categoryId ?? undefined,
  durationMins: s.durationMins ?? undefined,
  isEmergency: s.isEmergency,
  ...(s.isEmergency && { whenDay: WhenDay.ASAP }),
});

/**
 * /jobs/new: post a custom job, continue a draft, or change a posted job until a pro is hired (`?job=<id>`;
 * `?draft=` still works). A new job starts with one line ("kitchen tap leaking"), from `?describe=` or typed here;
 * the assistant fills in the form from it to check and post. `?category=`, `?emergency=1` and `?invite=<pro id>`
 * prefill too. Photos need a saved job, so adding the first one saves a draft; a saved draft's id goes into the URL.
 */
export const usePostJob = (): PostJobLayoutProps => {
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [params, setParams] = useSearchParams();
  // Read once: later saves change the URL, but the form never reloads under the customer
  const [initialDraftId] = useState(() => params.get('job') ?? params.get('draft'));
  const [presetCategory] = useState(() => params.get('category'));
  const [describeParam] = useState(() => params.get('describe') ?? params.get('description') ?? params.get('title') ?? '');
  // Posting for a chosen pro (from their profile): send it to them once posted
  const [inviteeId] = useState(() => params.get('invite'));
  const invitee = useGetProviderQuery({ id: inviteeId ?? '' }, { skip: !inviteeId });
  const addresses = useGetAddressesQuery();
  // undefined until the customer picks: a new job starts at the default address
  const [pickedAddressId, setPickedAddressId] = useState<string | null | undefined>(undefined);
  const [inviteProvider] = useInviteProviderMutation();
  const [jobId, setJobId] = useState<string | null>(initialDraftId);
  const draft = useGetJobQuery(initialDraftId ?? '', { skip: !initialDraftId });
  const catalog = useGetSkillCatalogQuery();
  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [assistJob, assisting] = useAssistJobMutation();
  const [addAttachment] = useAddAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const [form] = Form.useForm<PostJobFormValues>();
  const whenDay = Form.useWatch('whenDay', form);
  const location = useCurrentLocation(draft.data?.coordinates ?? null);
  const [step, setStep] = useState<'describe' | 'details'>(initialDraftId ? 'details' : 'describe');
  const [describeText, setDescribeText] = useState(describeParam);
  // How the form was filled in from the customer's words; null when they filled it in themselves
  const [suggestion, setSuggestion] = useState<'ai' | 'keywords' | null>(null);
  const [saving, setSaving] = useState<'draft' | 'post' | 'delete' | null>(null);
  const [error, setError] = useState<string>();
  // Photos added on this screen; saved draft photos come from the server
  const [uploads, setUploads] = useState<PhotoItem[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  // Unsaved changes: leaving asks first. A ref, so a save followed by navigation isn't blocked by a stale render.
  const dirty = useRef(false);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty.current && currentLocation.pathname !== nextLocation.pathname);

  // One dialog per blocked navigation, however often the screen re-renders behind it
  const confirming = useRef(false);
  useEffect(() => {
    if (blocker.state !== 'blocked' || confirming.current) return;
    confirming.current = true;
    modal.confirm({
      title: 'Leave without saving?',
      content: 'Your job details will be lost. Save a draft to finish it later.',
      okText: 'Leave',
      cancelText: 'Stay',
      onOk: () => {
        confirming.current = false;
        blocker.proceed();
      },
      onCancel: () => {
        confirming.current = false;
        blocker.reset();
      },
    });
  }, [blocker, modal]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  // Arrived with `?describe=` (home box, search): fill the form in straight away
  const autoAssisted = useRef(false);
  useEffect(() => {
    if (autoAssisted.current || initialDraftId || !describeParam.trim()) return;
    autoAssisted.current = true;
    assistJob(describeParam.trim())
      .unwrap()
      .then((s) => {
        form.setFieldsValue(fromSuggestion(s, presetCategory));
        setSuggestion(s.source);
      })
      .catch(() => form.setFieldsValue({ description: describeParam.trim() }))
      .finally(() => setStep('details'));
  }, [assistJob, describeParam, form, initialDraftId, presetCategory]);

  if (catalog.isLoading || addresses.isLoading || (initialDraftId && draft.isLoading)) return { loading: true };

  const savedAddresses = addresses.data ?? [];
  // A draft reopens at the saved address it was posted from
  const draftAddressId =
    savedAddresses.find((a) => a.pincode === draft.data?.pincode && a.areaName === draft.data?.areaName)?.id ?? null;
  const addressId =
    pickedAddressId === undefined
      ? initialDraftId ? draftAddressId : savedAddresses.find((a) => a.isDefault)?.id ?? null
      : pickedAddressId;
  const address = savedAddresses.find((a) => a.id === addressId) ?? null;
  const inviteeName = invitee.data?.displayName ?? null;

  // A posted job is edited in place: it stays posted and keeps its quotes
  const mode: PostJobMode = !initialDraftId ? 'new' : draft.data?.status === JobStatus.OPEN ? 'edit' : 'draft';
  const leave = (to: string) => {
    dirty.current = false;
    navigate(to, { replace: true });
  };
  const backToJob = (id: string) => leave(toPath(RouterKeys.JOB_DETAIL, { id }));

  const uploadIds = new Set(uploads.map((item) => item.id));
  const saved: PhotoItem[] = (draft.data?.attachments ?? [])
    .filter((item) => !removed.includes(item.id) && !uploadIds.has(item.id))
    .map((item) => ({ id: item.id, url: item.url, isVideo: item.contentType.startsWith('video/'), uploading: false }));
  const photos = [...saved, ...uploads];

  const toInput = (values: PostJobFormValues, submit: boolean): JobInput => {
    // Keep a saved time the customer didn't touch (it may not sit on a slot); "as soon as possible" is always now
    const savedTime = draft.data?.scheduledAt;
    const keepTime =
      savedTime && new Date(savedTime) > new Date() && values.whenDay !== WhenDay.ASAP &&
      !form.isFieldsTouched(['whenDay', 'whenDate', 'whenSlot']);
    return {
      title: values.title?.trim() || undefined,
      description: values.description?.trim() || null,
      categoryId: values.categoryId ?? null,
      coordinates: address ? address.coordinates : location.coordinates,
      pincode: values.pincode || null,
      areaName: values.areaName?.trim() || null,
      addressLine: address ? address.addressLine : values.addressLine?.trim() || null,
      budget: values.budget ?? null,
      scheduledAt: keepTime ? undefined : toSchedule(values),
      durationMins: values.durationMins ?? null,
      isEmergency: Boolean(values.isEmergency),
      submit,
    };
  };

  const persist = async (submit: boolean) => {
    const input = toInput(form.getFieldsValue(true), submit);
    const job = jobId ? await updateJob({ id: jobId, ...input }).unwrap() : await createJob(input).unwrap();
    if (!jobId) {
      // Reloading the page now continues this draft instead of starting a new one
      setParams((p) => {
        p.set('job', job.id);
        p.delete('describe');
        return p;
      }, { replace: true });
    }
    setJobId(job.id);
    return job.id;
  };

  const save = async (submit: boolean) => {
    setError(undefined);
    if (submit) {
      try {
        await form.validateFields();
      } catch (e) {
        const first = (e as { errorFields?: { name: (string | number)[] }[] }).errorFields?.[0];
        if (first) form.scrollToField(first.name, { behavior: 'smooth', block: 'center' });
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
      dirty.current = false;
      if (mode === 'edit') {
        message.success('Job updated. Pros who already quoted will see it was changed.');
        backToJob(id);
      } else if (submit && inviteeId) {
        try {
          await inviteProvider({ jobId: id, providerId: inviteeId, message: null }).unwrap();
          message.success(`Job posted and sent to ${inviteeName ?? 'the pro'}.`);
        } catch (e) {
          message.warning(`Job posted, but it couldn't be sent to ${inviteeName ?? 'the pro'}: ${apiErrorMessage(e)}`);
        }
        backToJob(id);
      } else if (submit) {
        message.success('Job posted. Pros nearby are being told about it now.');
        backToJob(id);
      } else {
        message.success('Draft saved. Continue any time from My jobs.');
      }
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  /** Photos attach to a saved job; the first photo saves a draft. */
  const ensureJob = async () => {
    if (jobId) return jobId;
    try {
      const id = await persist(false);
      dirty.current = false;
      return id;
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

  const toDetails = async () => {
    const text = describeText.trim();
    if (text.length < 3) {
      message.info('Tell us a little about the job first.');
      return;
    }
    dirty.current = true;
    try {
      const s = await assistJob(text).unwrap();
      form.setFieldsValue(fromSuggestion(s, presetCategory));
      setSuggestion(s.source);
    } catch {
      message.warning("We couldn't fill this in automatically. Add the details below.");
      form.setFieldsValue({ description: text });
      setSuggestion(null);
    }
    setStep('details');
  };

  const leftToday = slotsLeftToday();
  const dayOptions: ChipOption<WhenDay>[] = [
    { value: WhenDay.ASAP, label: 'As soon as possible' },
    { value: WhenDay.TODAY, label: 'Today', disabled: !leftToday.length },
    { value: WhenDay.TOMORROW, label: 'Tomorrow' },
    { value: WhenDay.DATE, label: 'Pick a date' },
  ];
  const slotOptions: ChipOption<WhenSlot>[] = SLOTS.map((slot) => ({
    value: slot,
    label: SLOT_LABELS[slot],
    disabled: whenDay === WhenDay.TODAY && !leftToday.includes(slot),
  }));

  return {
    loading: false,
    mode,
    step,
    describe: {
      value: describeText,
      onChange: setDescribeText,
      onContinue: () => void toDetails(),
      onSkip: () => {
        const text = describeText.trim();
        if (text) {
          dirty.current = true;
          form.setFieldsValue({ description: text });
        }
        setSuggestion(null);
        setStep('details');
      },
      loading: assisting.isLoading,
    },
    suggestion: suggestion && {
      source: suggestion,
      onStartOver: () => {
        setSuggestion(null);
        setStep('describe');
      },
    },
    form,
    initialValues: {
      ...fromDraft(draft.data, params),
      // A new job starts at the default address
      ...(!draft.data && address && { pincode: address.pincode, areaName: address.areaName }),
    },
    onValuesChange: (changed) => {
      dirty.current = true;
      // Typing a different pincode or area means it's not the saved address any more
      if (address && (('pincode' in changed && changed.pincode !== address.pincode) || ('areaName' in changed && changed.areaName !== address.areaName))) {
        setPickedAddressId(null);
      }
      // A day needs a time of day: the first one still open
      if ('whenDay' in changed && changed.whenDay && changed.whenDay !== WhenDay.ASAP) {
        const open = changed.whenDay === WhenDay.TODAY ? slotsLeftToday() : SLOTS;
        const slot = form.getFieldValue('whenSlot') as WhenSlot | undefined;
        if (!slot || !open.includes(slot)) form.setFieldValue('whenSlot', open[0]);
      }
    },
    invitee: inviteeId ? inviteeName ?? 'the pro' : null,
    addresses: savedAddresses.length
      ? {
          items: savedAddresses.map((a) => ({ id: a.id, label: `${ADDRESS_LABEL[a.label]} · ${a.areaName}` })),
          selectedId: addressId,
          onSelect: (id) => {
            setPickedAddressId(id);
            const picked = savedAddresses.find((a) => a.id === id);
            form.setFieldsValue(picked ? { pincode: picked.pincode, areaName: picked.areaName } : { pincode: undefined, areaName: undefined });
          },
        }
      : null,
    askAddressLine: !address,
    savedAddressLine: address?.addressLine ?? null,
    categories: (catalog.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    location,
    when: {
      dayOptions,
      slotOptions,
      showDate: whenDay === WhenDay.DATE,
      showSlots: Boolean(whenDay) && whenDay !== WhenDay.ASAP,
      minDate: localDay(addDays(new Date(), 1)),
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
    onDeleteDraft:
      mode === 'draft' && jobId
        ? async () => {
            setSaving('delete');
            try {
              await deleteJob(jobId).unwrap();
              message.success('Draft deleted.');
              leave(RouterKeys.JOBS);
            } catch (e) {
              setError(apiErrorMessage(e));
            } finally {
              setSaving(null);
            }
          }
        : null,
    onCancel: () => (jobId ? backToJob(jobId) : leave(RouterKeys.JOBS)),
  };
};
