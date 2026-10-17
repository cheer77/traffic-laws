export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-3xl rounded-3xl border border-white/70 bg-white/80 px-8 py-16 text-center shadow-xl shadow-slate-900/10 backdrop-blur sm:px-14">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
          Незабаром
        </p>
        <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          Платформа для вивчення ПДР України
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">
          Інтерактивне навчання дорожнім ситуаціям
        </p>
      </section>
    </main>
  );
}
