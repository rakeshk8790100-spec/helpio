import { App } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { JobAttachment } from '@/common/CommonDto';
import type { PhotoItem } from '@/components/common';
import { apiErrorMessage } from '@/lib/apiError';
import { JOB_MEDIA, pickMedia } from '@/lib/media';
import { useAddAttachmentMutation, useDeleteAttachmentMutation } from './postJob.api';

/**
 * The post form's photos: the draft's saved ones plus those added here, each uploaded as soon as it's picked.
 * Photos attach to a saved job, so `add` gets the job id from `ensureJob` (which saves a draft the first time).
 */
export const useJobPhotos = (saved: JobAttachment[] | undefined) => {
  const { message } = App.useApp();
  const [addAttachment] = useAddAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  // Photos added on this screen; saved draft photos come from the server
  const [uploads, setUploads] = useState<PhotoItem[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  // Local previews of photos being uploaded, released once uploaded, removed or when leaving the page
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const uploadIds = new Set(uploads.map((item) => item.id));
  const items: PhotoItem[] = [
    ...(saved ?? [])
      .filter((item) => !removed.includes(item.id) && !uploadIds.has(item.id))
      .map((item) => ({ id: item.id, url: item.url, isVideo: item.contentType.startsWith('video/'), uploading: false })),
    ...uploads,
  ];

  const forget = (url: string) => {
    if (!url.startsWith('blob:')) return;
    URL.revokeObjectURL(url);
    previews.current.delete(url);
  };

  const upload = async (jobId: string, file: File) => {
    const tempId = crypto.randomUUID();
    const preview = URL.createObjectURL(file);
    previews.current.add(preview);
    const mark = (patch: Partial<PhotoItem>) =>
      setUploads((list) => list.map((item) => (item.id === tempId ? { ...item, ...patch } : item)));
    setUploads((list) => [...list, { id: tempId, url: preview, isVideo: file.type.startsWith('video/'), uploading: true }]);
    try {
      const stored = await addAttachment({ jobId, file }).unwrap();
      mark({ id: stored.id, url: stored.url, uploading: false });
      // The stored copy shows now; the local preview isn't needed
      forget(preview);
    } catch (e) {
      mark({ uploading: false, error: apiErrorMessage(e).length > 40 ? 'Upload failed' : apiErrorMessage(e) });
    }
  };

  return {
    items,
    uploading: items.some((item) => item.uploading),
    add: async (files: File[], ensureJob: () => Promise<string | null>) => {
      const { accepted, warnings } = pickMedia(files, JOB_MEDIA, items.length);
      warnings.forEach((text) => message.warning(text));
      if (!accepted.length) return;
      const jobId = await ensureJob();
      if (jobId) await Promise.all(accepted.map((file) => upload(jobId, file)));
    },
    remove: async (photoId: string, jobId: string | null) => {
      const local = uploads.find((item) => item.id === photoId);
      if (local) forget(local.url);
      if (local?.error || !jobId) {
        setUploads((list) => list.filter((item) => item.id !== photoId));
        return;
      }
      try {
        await deleteAttachment({ jobId, attachmentId: photoId }).unwrap();
        setUploads((list) => list.filter((item) => item.id !== photoId));
        setRemoved((ids) => [...ids, photoId]);
      } catch (e) {
        message.error(apiErrorMessage(e));
      }
    },
  };
};
