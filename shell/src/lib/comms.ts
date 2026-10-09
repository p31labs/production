// 20 Cognitive Communication templates — neurodivergent-friendly phrasing
// Registered as llmTool commands for BASH/PHOS

export function emailSubject(args: { topic: string }): string { return `Re: ${args.topic?.slice(0, 60) ?? 'Checking in'}`; }

export function sayNo(args: { request: string }): string {
  return `Thanks for asking. I can't take on \"${(args.request ?? '').slice(0, 50)}\" right now — my plate is full.`;
}

export function setBoundary(args: { topic: string }): string {
  return `I need to set a boundary around \"${args.topic ?? 'this'}\". It's not something I can discuss right now. I appreciate your understanding.`;
}

export function askClarify(args: { unclear: string }): string {
  return `I want to make sure I understand. When you said \"${(args.unclear ?? '').slice(0, 50)}\", did you mean [A], [B], or something else?`;
}

export function followUp(args: { topic: string; daysAgo?: number }): string {
  return `Hi! Following up on \"${args.topic?.slice(0, 50) ?? 'our conversation'}\" from ${args.daysAgo ?? 'a few days'} ago. Any updates?`;
}

export function summarizeThread(args: { points: string[] }): string {
  return `Key points: ${(args.points ?? []).map((p, i) => `${i + 1}. ${p}`).join(' · ')}`;
}

export function asyncReference(args: { topic: string }): string {
  return `Regarding ${args.topic?.slice(0, 50) ?? 'this'} — this is async. No rush. Reply when you can.`;
}

export function declineMeeting(args: { reason: string }): string {
  return `I can't make this meeting. Reason: ${args.reason ?? 'scheduling conflict'}. Can we handle this async or reschedule?`;
}

export function negotiateDeadline(args: { current: string; proposed: string }): string {
  return `The current deadline is ${args.current ?? 'tight'}. I propose ${args.proposed ?? 'an extension'} — here's why: [your reason].`;
}

export function expressCapacity(args: { spoons?: number }): string {
  const level = (args.spoons ?? 3) <= 1 ? 'low' : (args.spoons ?? 3) <= 3 ? 'moderate' : 'full';
  return `My capacity is ${level} right now. I can handle [scope] today and the rest [later time].`;
}

export function thankYouNote(args: { for: string }): string {
  return `Thank you for ${args.for ?? 'your help'}. I really appreciated it — it made a difference.`;
}

export function introMessage(args: { role: string; context: string }): string {
  return `Hi! I'm reaching out in my role as ${args.role ?? 'a collaborator'}. ${args.context ?? 'Looking forward to connecting.'}`;
}

export function conflictPhrase(args: { issue: string }): string {
  return `I want to address something: ${args.issue?.slice(0, 80) ?? 'a concern I have'}. This matters to me because of [impact]. Can we talk about it?`;
}

export function statusBrief(args: { done: string; next: string; blocked: string }): string {
  return `Status: ✅ ${args.done ?? 'completed'} → Next: ${args.next ?? 'pending'} ${args.blocked ? `⚠ Blocked: ${args.blocked}` : ''}`;
}

export function meetingAgenda(args: { items: string[] }): string {
  return `Agenda:\n${(args.items ?? []).map((item, i) => `${i + 1}. ${item} (10 min)`).join('\n')}\nWrap: next steps (5 min)`;
}

export function readReceiptReply(args: { sender: string }): string {
  return `I saw your message, ${args.sender ?? 'there'}. I'll reply properly when I have the bandwidth — just wanted to acknowledge receipt.`;
}

export function escalationGuard(args: { concern: string }): string {
  return `I'm concerned about ${args.concern?.slice(0, 60) ?? 'this situation'}. Before escalating, can we try resolving it directly first? If not, I'll need to involve [person].`;
}

export function coWorkInvite(args: { task: string; duration?: number }): string {
  return `Want to co-work on \"${args.task?.slice(0, 50) ?? 'a task'}\"? ${args.duration ?? 25} minutes, focused. No talking required — just parallel presence.`;
}

export function requestAccommodation(args: { need: string }): string {
  return `I work best when [condition]. Would it be possible to ${args.need ?? 'adjust the setup'}? Thank you for considering this.`;
}

export function feedbackDelivery(args: { observation: string; impact: string }): string {
  return `I noticed: ${args.observation?.slice(0, 60) ?? ''}. The impact: ${args.impact?.slice(0, 60) ?? ''}. I'm sharing this because our working relationship matters to me.`;
}
