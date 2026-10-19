import Link from "next/link";

const benefits = [
  [
    "01",
    "Зрозумілі пояснення",
    "Після відповіді ви бачите не лише результат, а й коротке пояснення з посиланням на відповідний пункт ПДР.",
  ],
  [
    "02",
    "Наочні ситуації",
    "Текстові завдання та інтерактивні 3D-сцени допомагають побачити дорожню ситуацію з різних ракурсів.",
  ],
  [
    "03",
    "Власний темп",
    "Навчайтеся з телефона або комп’ютера, повертайтеся до історії відповідей і стежте за прогресом.",
  ],
] as const;

export default function HomePage() {
  return (
    <main>
      <header className="landing-header container">
        <Link className="brand" href="/" aria-label="Traffic Laws — головна">
          <span className="brand-mark">TL</span>
          <span>Traffic Laws</span>
        </Link>
        <nav className="landing-nav" aria-label="Навігація лендингу">
          <a href="#advantages">Переваги</a>
          <a href="#how-it-works">Як це працює</a>
          <a href="#faq">Питання</a>
        </nav>
        <div className="header-actions">
          <Link className="text-link" href="/login">
            Увійти
          </Link>
          <Link className="button button-small" href="/school">
            Почати навчання
          </Link>
        </div>
      </header>
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span /> Онлайн-школа ПДР України
          </p>
          <h1>
            Розумійте дорогу.
            <br />
            <em>Не завчайте відповіді.</em>
          </h1>
          <p className="hero-lead">
            Вивчайте правила дорожнього руху на зрозумілих прикладах, розбирайте складні перехрестя
            у 3D та бачте власний прогрес.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/school">
              Навчатися безкоштовно <span>→</span>
            </Link>
            <Link className="button button-ghost" href="/school">
              Переглянути завдання
            </Link>
          </div>
          <p className="microcopy">Без оплати · MVP-доступ · Українською мовою</p>
        </div>
        <div className="hero-visual" aria-label="Приклад інтерактивної дорожньої ситуації">
          <div className="demo-window">
            <div className="demo-topbar">
              <span />
              <span />
              <span />
              <b>Дорожня ситуація</b>
            </div>
            <div className="road-scene">
              <div className="road road-x" />
              <div className="road road-y" />
              <div className="lane-line lane-x" />
              <div className="lane-line lane-y" />
              <div className="car car-blue">1</div>
              <div className="car car-yellow">2</div>
              <div className="direction direction-a">→</div>
              <div className="direction direction-b">↑</div>
              <div className="scene-label">
                <span className="live-dot" /> Інтерактивний огляд
              </div>
            </div>
            <div className="demo-question">
              <span>Хто має проїхати перехрестя першим?</span>
              <b>Перевірити себе →</b>
            </div>
          </div>
          <div className="floating-card floating-progress">
            <strong>7 / 10</strong>
            <span>завдань опрацьовано</span>
          </div>
          <div className="floating-card floating-explain">
            <span>✓</span>
            <div>
              <strong>Є пояснення</strong>
              <small>до кожної відповіді</small>
            </div>
          </div>
        </div>
      </section>
      <section id="advantages" className="section container">
        <div className="section-heading">
          <p className="eyebrow">
            <span /> Чому Traffic Laws
          </p>
          <h2>
            Навчання, яке готує
            <br />
            до реальної дороги
          </h2>
          <p>
            Зосередьтеся на логіці правил і безпечних рішеннях, а не на механічному
            запам’ятовуванні.
          </p>
        </div>
        <div className="benefit-grid">
          {benefits.map(([number, title, text]) => (
            <article className="benefit-card" key={number}>
              <span className="benefit-number">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="how-it-works" className="dark-section">
        <div className="container how-grid">
          <div>
            <p className="eyebrow eyebrow-light">
              <span /> Простий процес
            </p>
            <h2>
              Від першого питання
              <br />
              до впевненого рішення
            </h2>
          </div>
          <ol className="steps">
            <li>
              <b>1</b>
              <div>
                <strong>Створіть обліковий запис</strong>
                <span>Достатньо електронної пошти та надійного пароля.</span>
              </div>
            </li>
            <li>
              <b>2</b>
              <div>
                <strong>Оберіть доступне завдання</strong>
                <span>Текстові та 3D-ситуації з єдиного каталогу.</span>
              </div>
            </li>
            <li>
              <b>3</b>
              <div>
                <strong>Дайте відповідь і розберіть правило</strong>
                <span>
                  Перевірка виконується на сервері, пояснення відкривається після відповіді.
                </span>
              </div>
            </li>
            <li>
              <b>4</b>
              <div>
                <strong>Продовжуйте з власним прогресом</strong>
                <span>Історія спроб допомагає бачити, що вже опрацьовано.</span>
              </div>
            </li>
          </ol>
        </div>
      </section>
      <section className="section container pricing-section">
        <div>
          <p className="eyebrow">
            <span /> Доступ
          </p>
          <h2>Спробуйте MVP безкоштовно</h2>
          <p>
            На етапі перевірки продукту доступ до опублікованих власником матеріалів безоплатний.
            Платних тарифів і прихованих списань немає.
          </p>
        </div>
        <div className="price-card">
          <span>Поточний план</span>
          <h3>MVP-доступ</h3>
          <p className="price">0 ₴</p>
          <ul>
            <li>Доступні навчальні завдання</li>
            <li>Текстові та 3D-ситуації</li>
            <li>Історія відповідей і прогрес</li>
          </ul>
          <Link className="button" href="/school">
            Створити акаунт
          </Link>
        </div>
      </section>
      <section id="faq" className="section container faq">
        <div className="section-heading">
          <p className="eyebrow">
            <span /> Часті питання
          </p>
          <h2>Коротко про головне</h2>
        </div>
        <div className="faq-list">
          <details>
            <summary>Це офіційні екзаменаційні білети?</summary>
            <p>
              Ні. Це авторські навчальні матеріали з посиланнями на чинні джерела. Вони не видаються
              за офіційну базу сервісного центру.
            </p>
          </details>
          <details>
            <summary>Як перевіряються відповіді?</summary>
            <p>
              Правильна відповідь зберігається у незмінній ревізії білета й перевіряється backend
              після вашої відповіді. Публікувати матеріали може лише уповноважений власник.
            </p>
          </details>
          <details>
            <summary>Чи працює платформа з телефона?</summary>
            <p>
              Так, основні сторінки адаптовані до мобільних екранів. Для важких 3D-сцен може
              знадобитися сучасний пристрій.
            </p>
          </details>
        </div>
      </section>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link className="brand brand-light" href="/">
              <span className="brand-mark">TL</span>
              <span>Traffic Laws</span>
            </Link>
            <p>Сучасний спосіб вивчати ПДР України.</p>
          </div>
          <div>
            <strong>Платформа</strong>
            <Link href="/register">Реєстрація</Link>
            <Link href="/login">Вхід</Link>
            <Link href="/school">Завдання</Link>
          </div>
          <div>
            <strong>Важливо</strong>
            <p>
              Навчальний MVP. Матеріали не замінюють офіційний текст ПДР та професійну підготовку.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
