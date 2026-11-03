export default function ErrorMessage({ message, retry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <div className="flex items-center justify-between gap-3">
        <p>{message || 'Something went wrong while loading this data.'}</p>
        {retry ? (
          <button onClick={retry} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
