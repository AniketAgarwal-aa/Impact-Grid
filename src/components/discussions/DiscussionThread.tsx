/**
 * Threaded discussion with @mentions
 */
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/components/common/Toast";
import { MessageSquare, Reply, Send, Trash2 } from "lucide-react";

interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  content: string;
  is_edited: boolean;
  created_at: string;
  replies: Comment[];
}

interface Props {
  entityType: string;
  entityId: number;
  title?: string;
}

function CommentItem({
  comment,
  onReply,
  onDelete,
  canDelete,
}: {
  comment: Comment;
  onReply: (id: number) => void;
  onDelete: (id: number) => void;
  canDelete: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{comment.user_name}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground rounded-full bg-accent px-2 py-0.5">
              {comment.user_role?.replace("_", " ")}
            </span>
            {comment.is_edited && (
              <span className="text-[10px] text-muted-foreground">edited</span>
            )}
          </div>
          <p className="text-sm mt-2 whitespace-pre-wrap break-words">
            {comment.content.split(/(@[\w.+-]+@[\w.-]+\.\w+|@[\w.-]+)/g).map((part, i) =>
              part.startsWith("@") ? (
                <span key={i} className="text-primary font-medium">
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </p>
          <div className="text-xs text-muted-foreground mt-2">
            {new Date(comment.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => onReply(comment.id)}
            className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground"
            title="Reply"
          >
            <Reply className="h-3.5 w-3.5" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="rounded-lg p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      {comment.replies?.length > 0 && (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-border space-y-3">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              onReply={onReply}
              onDelete={onDelete}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscussionThread({ entityType, entityId, title }: Props) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    api
      .getComments(entityType, entityId)
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [entityType, entityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await api.addComment({
        entity_type: entityType,
        entity_id: entityId,
        content: content.trim(),
        parent_comment_id: replyTo,
      });
      setContent("");
      setReplyTo(null);
      load();
      toast.success("Comment posted");
    } catch (err: unknown) {
      toast.error((err as Error)?.message || "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteComment(id);
      load();
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{title || "Discussion"}</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          Use @email to mention someone
        </span>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading discussion...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the discussion below.
          </p>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              onReply={setReplyTo}
              onDelete={handleDelete}
              canDelete={user?.role === "admin" || c.user_id === user?.id}
            />
          ))
        )}

        <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t border-border">
          {replyTo && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Replying to comment #{replyTo}</span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-primary">
                Cancel
              </button>
            </div>
          )}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="Write a comment... Use @user@email.com to mention"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary outline-none resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {replyTo ? "Reply" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
