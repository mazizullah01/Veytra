import ContactForm from "@/components/ContactForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="container prose" style={{ maxWidth: 980 }}>
      <span className="eyebrow">Get in touch</span>
      <h1>Contact</h1>
      <p>
        Questions about an order, sizing or a fabric? Our client care team
        replies within one business day.
      </p>

      <div className="contact-grid" style={{ marginTop: "2.5rem" }}>
        <ContactForm />

        <div>
          <h2 style={{ marginTop: 0 }}>Client care</h2>
          <p>
            Email: care@veytra.example
            <br />
            Phone: +1 (555) 019-2847
            <br />
            Hours: Mon–Fri, 9am–6pm GMT
          </p>
          <h2>Studio</h2>
          <p>
            14 Mercer Street
            <br />
            London, W1D 2LP
            <br />
            United Kingdom
          </p>
          <h2>Press</h2>
          <p>press@veytra.example</p>
        </div>
      </div>
    </div>
  );
}
