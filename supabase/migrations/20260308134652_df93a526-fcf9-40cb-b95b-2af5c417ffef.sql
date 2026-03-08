
-- Add civic_score to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civic_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS civic_level text NOT NULL DEFAULT 'New Citizen';

-- Function to update civic level based on score
CREATE OR REPLACE FUNCTION public.update_civic_level()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.civic_level := CASE
    WHEN NEW.civic_score >= 200 THEN 'Civic Champion'
    WHEN NEW.civic_score >= 100 THEN 'Responsible Citizen'
    WHEN NEW.civic_score >= 50 THEN 'Active Contributor'
    WHEN NEW.civic_score >= 20 THEN 'Engaged Citizen'
    ELSE 'New Citizen'
  END;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update civic level
DROP TRIGGER IF EXISTS trigger_update_civic_level ON public.profiles;
CREATE TRIGGER trigger_update_civic_level
  BEFORE UPDATE OF civic_score ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_civic_level();

-- Function to award points for reporting
CREATE OR REPLACE FUNCTION public.award_report_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET civic_score = civic_score + 10 WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_report_points ON public.issues;
CREATE TRIGGER trigger_award_report_points
  AFTER INSERT ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.award_report_points();

-- Function to award points for upvoting
CREATE OR REPLACE FUNCTION public.award_vote_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles SET civic_score = civic_score + 2 WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_vote_points ON public.issue_votes;
CREATE TRIGGER trigger_award_vote_points
  AFTER INSERT ON public.issue_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.award_vote_points();

-- Function to award points when issue is resolved
CREATE OR REPLACE FUNCTION public.award_resolve_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != 'Resolved' AND NEW.status = 'Resolved' THEN
    UPDATE public.profiles SET civic_score = civic_score + 20 WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_resolve_points ON public.issues;
CREATE TRIGGER trigger_award_resolve_points
  AFTER UPDATE OF status ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.award_resolve_points();
