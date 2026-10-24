"""
EcoVision AI - Arduino Smart Segregation Hardware Controller
Provides dual-mode (Physical Serial & High-Fidelity Simulation) servo gate actuation
with safety threshold verification, emergency stop interlock, and execution audit logging.
"""

import time
import logging
from typing import Dict, Any, Optional

from app.schemas import WasteCategoryEnum, ArduinoTriggerResponse

logger = logging.getLogger("ecovision.arduino")

BIN_CONFIG = {
    WasteCategoryEnum.PLASTIC: {"bin_name": "Bin 1: Plastics", "servo_angle": 30, "gate_id": "GATE_PLASTIC"},
    WasteCategoryEnum.PAPER_CARDBOARD: {"bin_name": "Bin 2: Paper & Cardboard", "servo_angle": 60, "gate_id": "GATE_PAPER"},
    WasteCategoryEnum.METAL: {"bin_name": "Bin 3: Metals & Cans", "servo_angle": 90, "gate_id": "GATE_METAL"},
    WasteCategoryEnum.GLASS: {"bin_name": "Bin 4: Glass", "servo_angle": 120, "gate_id": "GATE_GLASS"},
    WasteCategoryEnum.ORGANIC: {"bin_name": "Bin 5: Organics & Compost", "servo_angle": 150, "gate_id": "GATE_ORGANIC"},
    WasteCategoryEnum.E_WASTE: {"bin_name": "Bin 6: Special E-Waste Containment", "servo_angle": 180, "gate_id": "GATE_EWASTE"},
}

class ArduinoSmartSegregationController:
    """Manages serial protocol actuation and simulation for smart sorting bins."""

    def __init__(self, port: str = "COM3", baudrate: int = 9600, simulation_mode: bool = True):
        self.port = port
        self.baudrate = baudrate
        self.simulation_mode = simulation_mode
        self.emergency_stop_active = False
        self.hardware_enabled = False
        self.current_servo_angle = 0
        self.last_action_timestamp = None
        self.serial_connection = None
        self.command_audit_log = []
        
        self._init_connection()

    def _init_connection(self):
        if not self.simulation_mode:
            try:
                import serial
                self.serial_connection = serial.Serial(self.port, self.baudrate, timeout=1.5)
                logger.info(f"Connected to Arduino hardware on {self.port} at {self.baudrate} baud.")
            except Exception as e:
                logger.warning(f"Could not connect to physical Arduino on {self.port}: {e}. Switching to simulation mode.")
                self.simulation_mode = True
        else:
            logger.info("Arduino Smart Segregation running in Simulation Mode (safe testbed).")

    def trigger_segregation(
        self,
        category: WasteCategoryEnum,
        confidence: float,
        item_subtype: str,
        force_simulation: bool = False
    ) -> ArduinoTriggerResponse:
        """
        Actuates sorting servo gate for confirmed waste item.
        Adheres to safety constraints:
        - Emergency stop check
        - Minimum confidence threshold (0.50)
        - Unknown/Low-confidence items default to Neutral / No Movement
        """
        # Safety Check 1: Emergency stop
        if self.emergency_stop_active:
            return ArduinoTriggerResponse(
                success=False,
                target_bin="NONE (EMERGENCY STOP)",
                servo_angle=0,
                executed_mode="emergency_locked",
                message="Actuation rejected: Emergency stop is actively engaged."
            )

        # Safety Check 2: Low confidence or unknown category
        if confidence < 0.50 or category == WasteCategoryEnum.UNKNOWN or category == WasteCategoryEnum.OTHER_MIXED:
            return ArduinoTriggerResponse(
                success=False,
                target_bin="Neutral Inspection Gate",
                servo_angle=0,
                executed_mode="neutral_safety_stop",
                message=f"No mechanical movement triggered: Category '{category.value}' with confidence {confidence:.2f} requires manual review."
            )

        config = BIN_CONFIG.get(category)
        if not config:
            return ArduinoTriggerResponse(
                success=False,
                target_bin="General Residual",
                servo_angle=0,
                executed_mode="safety_default",
                message="No dedicated sorting bin defined for this category."
            )

        target_bin = config["bin_name"]
        target_angle = config["servo_angle"]
        gate_id = config["gate_id"]

        is_sim = self.simulation_mode or force_simulation or (self.serial_connection is None)

        if not is_sim and self.serial_connection:
            try:
                # Protocol command syntax: "MOVE <ANGLE>\n"
                cmd = f"MOVE {target_angle}\n".encode("utf-8")
                self.serial_connection.write(cmd)
                response_line = self.serial_connection.readline().decode("utf-8").strip()
                self.current_servo_angle = target_angle
                status_msg = f"Physical servo rotated to {target_angle}° for {target_bin}. Arduino response: {response_line}"
                exec_mode = "physical_hardware"
            except Exception as e:
                logger.error(f"Serial transmission failed: {e}. Defaulting to safe position.")
                return ArduinoTriggerResponse(
                    success=False,
                    target_bin="ERROR",
                    servo_angle=0,
                    executed_mode="hardware_error",
                    message=f"Hardware failure during transmission: {e}"
                )
        else:
            # High-fidelity simulation telemetry
            self.current_servo_angle = target_angle
            status_msg = f"[SIMULATION] Servo motor safely oriented to {target_angle}° guiding item into '{target_bin}'."
            exec_mode = "simulated_hardware"

        # Record audit log
        log_entry = {
            "timestamp": time.time(),
            "category": category.value,
            "subtype": item_subtype,
            "confidence": confidence,
            "angle": target_angle,
            "bin": target_bin,
            "mode": exec_mode
        }
        self.command_audit_log.append(log_entry)
        if len(self.command_audit_log) > 50:
            self.command_audit_log.pop(0)

        return ArduinoTriggerResponse(
            success=True,
            target_bin=target_bin,
            servo_angle=target_angle,
            executed_mode=exec_mode,
            message=status_msg
        )

    def emergency_stop(self) -> Dict[str, Any]:
        """Locks hardware and resets servo to zero degrees."""
        self.emergency_stop_active = True
        self.current_servo_angle = 0
        if self.serial_connection:
            try:
                self.serial_connection.write(b"ESTOP\n")
            except Exception:
                pass
        return {"status": "emergency_stop_engaged", "servo_angle": 0, "safety": "LOCKED"}

    def reset_emergency_stop(self) -> Dict[str, Any]:
        """Clears emergency stop after manual safety confirmation."""
        self.emergency_stop_active = False
        return {"status": "ready", "servo_angle": self.current_servo_angle, "safety": "NORMAL"}
