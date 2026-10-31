import ReviewsAdminLayout from '../../../../client/default/admin/reviewsAdmin.layout';
import { useAdminReviews } from '../../../../hooks/admin/useAdminReviews';

/** /admin/reviews */
const ReviewsAdminPage = () => <ReviewsAdminLayout {...useAdminReviews()} />;

export default ReviewsAdminPage;
