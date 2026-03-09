import { prisma } from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { NextResponse } from 'next/server';
import { moderateContent } from '@/lib/moderation';

/**
 * @openapi
 * /api/reports:
 *   post:
 *     summary: Report a thread, post, or reply as inappropriate
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentType, contentId, reason]
 *             properties:
 *               contentType:
 *                 type: string
 *                 enum: [THREAD, POST, REPLY]
 *                 example: "POST"
 *               contentId:
 *                 type: string
 *                 example: "clxpost001"
 *               reason:
 *                 type: string
 *                 example: "This post contains hate speech."
 *     responses:
 *       201:
 *         description: Report submitted
 *       400:
 *         description: Missing fields, invalid contentType, or reporting own content
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reported content not found
 *       409:
 *         description: Duplicate report from same user
 *       500:
 *         description: Internal server error
 */
// POST /api/reports
// Allows an authenticated user to report a thread, post, or reply as inappropriate.
// Creates a ReportedItem (or reuses an existing one) and attaches a Report from this user.
export const POST = withAuth(async (req: AuthenticatedRequest) => {
    const userId = req.user.user_id;

    // Parse and validate the request body
    let body: { contentType?: string; contentId?: string; reason?: string }
    try {
        body = await req.json()
    } catch {
        return NextResponse.json(
            { message: 'Invalid JSON body' },
            { status: 400 }
        )
    }
    const { contentType, contentId, reason } = body;

    // Validate required fields
    if (!contentType || !contentId || !reason) {
        return NextResponse.json(
            { message: 'contentType, contentId, and reason are required' },
            { status: 400 }
        );
    }

    // Validate contentType is one of the allowed values
    const allowedTypes = ['THREAD', 'POST', 'REPLY'];
    if (!allowedTypes.includes(contentType.toUpperCase())) {
        return NextResponse.json(
            { message: 'contentType must be one of: THREAD, POST, REPLY' },
            { status: 400 }
        );
    }

    const normalizedType = contentType.toUpperCase();

    try {
        // Verify the content actually exists and is not already hidden
        const contentExists = await verifyContentExists(normalizedType, contentId);
        if (!contentExists) {
            return NextResponse.json(
                { message: `${normalizedType} with id ${contentId} not found` },
                { status: 404 }
            );
        }

        // Prevent users from reporting their own content
        const contentAuthorId = await getContentAuthorId(normalizedType, contentId);
        if (contentAuthorId === userId) {
            return NextResponse.json(
                { message: 'You cannot report your own content' },
                { status: 400 }
            );
        }

        // Use a transaction to atomically create/update the ReportedItem and create the Report
        const report = await prisma.$transaction(async (tx) => {
            // Upsert the ReportedItem — create if first report, update count if already reported
            const reportedItem = await tx.reportedItem.upsert({
                where: {
                    contentType_contentId: {
                        contentType: normalizedType,
                        contentId: contentId,
                    },
                },
                create: {
                    contentType: normalizedType,
                    contentId: contentId,
                    reportCount: 1,
                    status: 'pending',
                    lastReportedAt: new Date(),
                },
                update: {
                    reportCount: { increment: 1 },
                    lastReportedAt: new Date(),
                },
            });

            // Check if this user has already reported this same content
            const existingReport = await tx.report.findFirst({
                where: {
                    reporterId: userId,
                    reportedItemId: reportedItem.id,
                },
            });

            if (existingReport) {
                throw new Error('DUPLICATE_REPORT');
            }

            // Create the individual report
            const newReport = await tx.report.create({
                data: {
                    reporterId: userId,
                    reportedItemId: reportedItem.id,
                    reason: reason,
                    status: 'pending',
                },
                include: {
                    reportedItem: {
                        select: {
                            contentType: true,
                            contentId: true,
                            reportCount: true,
                            status: true,
                        },
                    },
                },
            });

            return newReport;
        });

        // Fire-and-forget: run AI analysis on the reported content so the admin
        // gets an AI verdict when reviewing this item in the queue.
        getContentText(report.reportedItem.contentType, report.reportedItem.contentId)
            .then((text) => {
                if (text) {
                    return moderateContent(
                        report.reportedItem.contentType,
                        report.reportedItem.contentId,
                        text
                    );
                }
            })
            .catch(() => {});

        return NextResponse.json(
            {
                id: report.id,
                contentType: report.reportedItem.contentType,
                contentId: report.reportedItem.contentId,
                reason: report.reason,
                status: report.status,
                createdAt: report.createdAt,
            },
            { status: 201 }
        );
    } catch (error: any) {
        if (error?.message === 'DUPLICATE_REPORT') {
            return NextResponse.json(
                { message: 'You have already reported this content' },
                { status: 409 }
            );
        }
        console.error('REPORT ERROR:', error);
        return NextResponse.json(
            { message: 'Something went wrong' },
            { status: 500 }
        );
    }
});

// Checks that the referenced content exists and is visible (not hidden)
async function verifyContentExists(contentType: string, contentId: string): Promise<boolean> {
    switch (contentType) {
        case 'THREAD': {
            const thread = await prisma.thread.findUnique({
                where: { id: contentId },
            });
            return !!thread && !thread.isHidden;
        }
        case 'POST': {
            const post = await prisma.post.findUnique({
                where: { id: contentId },
            });
            return !!post && !post.isHidden;
        }
        case 'REPLY': {
            const reply = await prisma.reply.findUnique({
                where: { id: contentId },
            });
            return !!reply && !reply.isHidden;
        }
        default:
            return false;
    }
}

// Returns the authorId of the content being reported
async function getContentAuthorId(contentType: string, contentId: string): Promise<string | null> {
    switch (contentType) {
        case 'THREAD': {
            const thread = await prisma.thread.findUnique({
                where: { id: contentId },
                select: { authorId: true },
            });
            return thread?.authorId ?? null;
        }
        case 'POST': {
            const post = await prisma.post.findUnique({
                where: { id: contentId },
                select: { authorId: true },
            });
            return post?.authorId ?? null;
        }
        case 'REPLY': {
            const reply = await prisma.reply.findUnique({
                where: { id: contentId },
                select: { authorId: true },
            });
            return reply?.authorId ?? null;
        }
        default:
            return null;
    }
}

// Returns the text content of a reported item for AI analysis
async function getContentText(contentType: string, contentId: string): Promise<string | null> {
    switch (contentType) {
        case 'THREAD': {
            const thread = await prisma.thread.findUnique({
                where: { id: contentId },
                select: { title: true },
            });
            return thread?.title ?? null;
        }
        case 'POST': {
            const post = await prisma.post.findUnique({
                where: { id: contentId },
                select: { content: true },
            });
            return post?.content ?? null;
        }
        case 'REPLY': {
            const reply = await prisma.reply.findUnique({
                where: { id: contentId },
                select: { content: true },
            });
            return reply?.content ?? null;
        }
        default:
            return null;
    }
}
