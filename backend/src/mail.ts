import nodemailer from "nodemailer";

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;
const transport = user && pass ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } }) : null;

export async function sendMail(to: string, subject: string, text: string) {
  if (!transport) {
    if (process.env.NODE_ENV === "production") throw new Error("mail_not_configured");
    // 메일 계정이 없을 때만 쓰는 개발용 경로. 코드는 화면이나 응답에 내보내지 않는다.
    console.log(`[mail:dev] to=${to} subject=${subject}\n${text}`);
    return;
  }
  await transport.sendMail({ from: `재수강 <${user}>`, to, subject, text });
}
