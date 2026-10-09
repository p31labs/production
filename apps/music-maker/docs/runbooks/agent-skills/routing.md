# Agent Routing Rules (deterministic)

IF alert = ControlRoomDown AND duration > 2m → PAGE on-call
IF alert = HibernationWakeFail AND duration > 5m → PAGE on-call
IF alert = BackpressureStorm AND duration > 10m → TICKET (next business day)
IF alert = LearnArmStuck AND duration > 30m → TICKET
IF alert = WledOffline AND duration > 5m → TICKET
IF alert = D1SchemaDrift AND any → PAGE on-call
IF error_rate > 2% for > 5m AND NOT in deploy window → PAGE on-call
OTHERWISE → append to lessons.md
