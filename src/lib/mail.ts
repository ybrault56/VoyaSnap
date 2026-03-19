import nodemailer from "nodemailer";
import { getEmailConfig } from "./env";
import type { NotificationEvent } from "./types";
import { nowIso } from "./utils";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  const config = getEmailConfig();
  if (!config) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth:
          config.user && config.password
            ? {
                user: config.user,
                pass: config.password,
              }
            : undefined,
      }),
    );
  }

  return transporterPromise;
}

export type EmailDeliveryResult = {
  notificationId: string;
  sentAt?: string;
  deliveryError?: string;
};

export async function sendNotificationEmail(
  notification: NotificationEvent,
): Promise<EmailDeliveryResult> {
  const config = getEmailConfig();
  const transporter = await getTransporter();

  if (!config || !transporter) {
    return {
      notificationId: notification.id,
      deliveryError: "Email delivery is not configured.",
    };
  }

  try {
    await transporter.sendMail({
      from: config.from,
      to: notification.recipient,
      replyTo: config.replyTo,
      subject: notification.payload.subject,
      text: notification.payload.body,
    });

    return {
      notificationId: notification.id,
      sentAt: nowIso(),
    };
  } catch (error) {
    return {
      notificationId: notification.id,
      deliveryError: error instanceof Error ? error.message : "Email delivery failed.",
    };
  }
}