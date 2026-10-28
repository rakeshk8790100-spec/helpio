import { useState } from 'react';
import { App } from 'antd';
import type { JobReviewProps, ReviewView } from '../client/default/jobs/jobs.layout.types';
import type { JobReview } from '../common/CommonDto';
import { apiErrorMessage } from '../lib/apiError';
import { formatShortDate } from '../lib/utils';
import { useGetJobReviewsQuery, useSubmitJobReviewMutation } from '../pages/jobs/jobs.api';

type Role = 'customer' | 'provider';

const MAX_COMMENT = 500;

const toView = (review: JobReview, caption: string): ReviewView => ({
  rating: review.rating,
  comment: review.comment,
  caption: `${caption} · ${formatShortDate(review.createdAt)}`,
});

interface Options {
  /** Reviews open once all four stages are approved */
  skip: boolean;
  /** The other person, e.g. "Ravi S." */
  otherName: string;
}

/** After 100%: the customer rates the pro and the pro rates the customer, once each. */
export const useJobReview = (jobId: string, role: Role, { skip, otherName }: Options): JobReviewProps | null => {
  const { message } = App.useApp();
  const { data, error, isLoading, refetch } = useGetJobReviewsQuery(jobId, { skip });
  const [submitReview, { isLoading: sending }] = useSubmitJobReviewMutation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string>();

  if (skip) return null;
  if (isLoading) return { status: 'loading' };
  if (!data) return { status: 'error', message: apiErrorMessage(error), onRetry: refetch };

  return {
    status: 'ready',
    title: data.canReview ? (role === 'customer' ? `How did ${otherName} do?` : `How was working with ${otherName}?`) : 'Reviews',
    form: data.canReview
      ? {
          hint:
            role === 'customer'
              ? `Your rating shows on ${otherName}'s profile and helps other customers choose. You can't change it later.`
              : "Your rating helps other pros know what to expect. You can't change it later.",
          rating,
          onRatingChange: (value) => {
            setFormError(undefined);
            setRating(value);
          },
          comment,
          onCommentChange: (value) => {
            setFormError(undefined);
            setComment(value);
          },
          maxLength: MAX_COMMENT,
          sending,
          error: formError,
          onSend: async () => {
            if (!rating) return setFormError('Pick 1 to 5 stars.');
            try {
              await submitReview({ jobId, rating, comment: comment.trim() || null }).unwrap();
              message.success(`Thanks! ${otherName} can now see your review.`);
            } catch (e) {
              setFormError(apiErrorMessage(e));
            }
          },
        }
      : null,
    mine: data.mine && toView(data.mine, 'Your review'),
    theirs: data.theirs && toView(data.theirs, `${data.theirs.reviewerLabel} rated you`),
    waitingText: data.mine && !data.theirs ? `${otherName} hasn't reviewed you yet.` : null,
  };
};
