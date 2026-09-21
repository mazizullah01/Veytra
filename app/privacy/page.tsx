export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container prose">
      <span className="eyebrow">Legal</span>
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().getFullYear()}</p>

      <p>
        This is a demonstration website. It does not operate a real store, does
        not process payments, and does not transmit any personal information to
        a server. The policy below describes how a production VEYTRA store would
        handle your data.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>Contact details you provide at checkout or when subscribing.</li>
        <li>Order and delivery information required to fulfil a purchase.</li>
        <li>Anonymous analytics about how the site is used.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To process orders, provide customer support, and — with your consent —
        send marketing communications you can unsubscribe from at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data by contacting care@veytra.example. We never sell your data.
      </p>

      <h2>Cookies</h2>
      <p>
        This demo stores your cart in your browser&apos;s local storage only. No
        tracking cookies are set.
      </p>
    </div>
  );
}
