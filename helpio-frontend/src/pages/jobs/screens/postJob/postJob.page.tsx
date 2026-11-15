import { App, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import { PostJobForm } from '@/clients';
import { useGetSkillCatalogQuery, useGetAddressesQuery } from '@/common/CommonApi';
import { JobStatus } from '@/common/CommonEnum';
import { ADDRESS_LABEL } from '@/common/CommonLabels';
import type { ChipOption } from '@/components/ui';
import SuspenseWrapper from '@/components/wrapper/SuspenseWrapper';
import { RouterKeys, toPath } from '@/config/router/RouterKeys';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { apiErrorMessage } from '@/lib/apiError';
import { JOB_MEDIA } from '@/lib/media';
import { useDeleteJobMutation, useGetJobQuery, useInviteProviderMutation } from '@/pages/jobs/jobs.api';
import { useGetProviderQuery } from '@/pages/pros/pros.api';
import { useAssistJobMutation, useCreateJobMutation, useUpdateJobMutation } from './postJob.api';
import { SLOTS, SLOT_LABELS, addDays, fromDraft, fromSuggestion, localDay, slotsLeftToday, toSchedule } from './postJob.helpers';
import { useJobPhotos } from './postJob.photos';
import type { PostJobFormValues, PostJobLayoutProps, PostJobMode, JobInput } from './types/postJob.dto';
import { WhenDay, WhenSlot } from './types/postJob.enum';

/**
 * /jobs/new: post a custom job, continue a draft, or change a posted job until a pro is hired (`?job=<id>`;
 * `?draft=` still works). A new job starts with one line ("kitchen tap leaking"), from `?describe=` or typed here;
 * the assistant fills in the form from it to check and post. `?category=`, `?emergency=1` and `?invite=<pro id>`
 * prefill too. Photos need a saved job, so adding the first one saves a draft; a saved draft's id goes into the URL.
 */
const usePostJob = (): PostJobLayoutProps => {
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
  // The saved job's id as soon as it exists, and the create in flight: two saves at once (a photo and "Save draft")
  // must update one job, never create two
  const savedId = useRef<string | null>(initialDraftId);
  const creating = useRef<Promise<string> | null>(null);
  const draft = useGetJobQuery(initialDraftId ?? '', { skip: !initialDraftId });
  const catalog = useGetSkillCatalogQuery();
  const [createJob] = useCreateJobMutation();
  const [updateJob] = useUpdateJobMutation();
  const [deleteJob] = useDeleteJobMutation();
  const [assistJob, assisting] = useAssistJobMutation();
  const [form] = Form.useForm<PostJobFormValues>();
  const whenDay = Form.useWatch('whenDay', form);
  const location = useCurrentLocation(draft.data?.coordinates ?? null);
  const [step, setStep] = useState<'describe' | 'details'>(initialDraftId ? 'details' : 'describe');
  const [describeText, setDescribeText] = useState(describeParam);
  // How the form was filled in from the customer's words; null when they filled it in themselves
  const [suggestion, setSuggestion] = useState<'ai' | 'keywords' | null>(null);
  const [saving, setSaving] = useState<'draft' | 'post' | 'delete' | null>(null);
  const [error, setError] = useState<string>();
  const photos = useJobPhotos(draft.data?.attachments);
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

  if (catalog.isLoading || addresses.isLoading || (initialDraftId && draft.isLoading)) return { status: 'loading' };
  // A draft that's gone (deleted, or not yours) or no categories to pick: say so instead of an empty form
  if (initialDraftId && !draft.data) {
    return { status: 'error', message: apiErrorMessage(draft.error), onRetry: () => void draft.refetch() };
  }
  if (!catalog.data) return { status: 'error', message: apiErrorMessage(catalog.error), onRetry: () => void catalog.refetch() };

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
    void navigate(to, { replace: true });
  };
  const backToJob = (id: string) => leave(toPath(RouterKeys.JOB_DETAIL, { id }));


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
    if (!savedId.current && creating.current) await creating.current;
    if (savedId.current) {
      const job = await updateJob({ id: savedId.current, ...input }).unwrap();
      return job.id;
    }
    creating.current = createJob(input)
      .unwrap()
      .then((job) => {
        savedId.current = job.id;
        setJobId(job.id);
        // Reloading the page now continues this draft instead of starting a new one
        setParams((params) => {
          params.set('job', job.id);
          params.delete('describe');
          return params;
        }, { replace: true });
        return job.id;
      });
    try {
      return await creating.current;
    } finally {
      creating.current = null;
    }
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
      if (photos.uploading) {
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
    if (savedId.current) return savedId.current;
    try {
      const id = await persist(false);
      dirty.current = false;
      return id;
    } catch (e) {
      setError(apiErrorMessage(e));
      return null;
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
    status: 'ready',
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
      items: photos.items,
      max: JOB_MEDIA.maxCount,
      disabled: saving !== null,
      onAdd: (files) => photos.add(files, ensureJob),
      onRemove: (photoId) => photos.remove(photoId, jobId),
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

/** /jobs/new: post a custom job, continue a draft or edit a posted one (`?job=<id>`). */
const PostJobPage = () => <SuspenseWrapper><PostJobForm {...usePostJob()} /></SuspenseWrapper>;

export default PostJobPage;
