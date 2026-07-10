import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isApprovedRegistrationEmail } from "@/lib/approved-registration-emails";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: "Email, password, and password confirmation are required." },
        { status: 400 }
      );
    }

    if (!isApprovedRegistrationEmail(email)) {
      return NextResponse.json(
        { error: "Registration is not authorized for this email address." },
        { status: 403 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account already exists for this email address." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: email,
        passwordHash,
        role: "ADMIN",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "USER_REGISTERED",
        entityType: "USER",
        entityId: user.id,
        newValueJson: JSON.stringify({
          email: user.email,
          role: user.role,
          registrationMethod: "APPROVED_EMAIL_SELF_REGISTRATION",
        }),
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/register failed", error);

    return NextResponse.json(
      { error: "Failed to register account." },
      { status: 500 }
    );
  }
}