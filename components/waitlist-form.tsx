"use client";

import { useLanguage } from "@/components/language-provider";
import { FormEvent, useEffect, useRef, useState } from "react";

export function WaitlistForm() {
  const { text } = useLanguage();
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [nameError, setNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimer.current !== null) window.clearTimeout(submitTimer.current);
    };
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const hasValidEmail = /^\S+@\S+\.\S+$/.test(email);

    setNameError(!name);
    setEmailError(!hasValidEmail);

    if (!name || !hasValidEmail) {
      return;
    }

    setIsSubmitting(true);
    submitTimer.current = window.setTimeout(() => {
      setSubmittedEmail(email);
      setIsSubmitting(false);
    }, 700);
  }

  if (submittedEmail) {
    return (
      <div role="status" aria-live="polite" className="max-w-lg">
        <h3 className="text-4xl font-black leading-none tracking-[-0.05em] sm:text-5xl">
          {text.waitlist.form.successTitle}
        </h3>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          {text.waitlist.form.successStart}{" "}
          <strong className="text-foreground">{submittedEmail}</strong>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="name" className="text-sm font-black">
          {text.waitlist.form.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          aria-describedby="name-error"
          aria-invalid={nameError}
          required
          className="min-h-13 border border-foreground bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          placeholder={text.waitlist.form.namePlaceholder}
        />
        <p id="name-error" className="min-h-5 text-sm font-bold text-destructive">
          {nameError ? text.waitlist.form.nameError : ""}
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="email" className="text-sm font-black">
          {text.waitlist.form.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-describedby="email-error"
          aria-invalid={emailError}
          required
          className="min-h-13 border border-foreground bg-background px-4 text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          placeholder={text.waitlist.form.emailPlaceholder}
        />
        <p id="email-error" className="min-h-5 text-sm font-bold text-destructive">
          {emailError ? text.waitlist.form.emailError : ""}
        </p>
      </div>

      <div className="grid gap-2">
        <label htmlFor="plan" className="text-sm font-black">
          {text.waitlist.form.plan}
        </label>
        <select
          id="plan"
          name="plan"
          className="min-h-13 border border-foreground bg-background px-4 text-foreground outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        >
          <option value="Solo">Solo</option>
          <option value="Plus">Plus</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 min-h-13 border border-foreground bg-foreground px-6 font-black text-background shadow-[6px_6px_0_var(--primary)] transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 active:translate-y-px active:scale-[0.99]"
      >
        {isSubmitting ? text.waitlist.form.saving : text.waitlist.form.submit}
      </button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {text.waitlist.form.note}
      </p>
    </form>
  );
}
