import { Skeleton } from 'antd';

/** Generic page-level loading placeholder. */
const PageSkeleton = () => (
  <div className="flex flex-col gap-5">
    <Skeleton active title={{ width: '50%' }} paragraph={{ rows: 1 }} />
    <Skeleton.Input active block style={{ height: 48 }} />
    <div className="rounded-2xl border border-slate-100 p-4">
      <Skeleton active paragraph={{ rows: 3 }} />
    </div>
    <div className="flex gap-3">
      <Skeleton.Node active style={{ width: 160, height: 110 }} />
      <Skeleton.Node active style={{ width: 160, height: 110 }} />
    </div>
  </div>
);

export default PageSkeleton;
