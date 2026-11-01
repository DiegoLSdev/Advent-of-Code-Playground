export function Stars({ count }: { count: number }) {
  return (
    <>
      <span className={`star ${count >= 1 ? (count >= 2 ? 'gold' : 'silver') : ''}`}>*</span>
      <span className={`star ${count >= 2 ? 'gold' : ''}`}>*</span>
    </>
  );
}
