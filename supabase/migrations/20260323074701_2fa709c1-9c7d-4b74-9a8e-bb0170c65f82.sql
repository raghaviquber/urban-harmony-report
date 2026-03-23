
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_issue_created ON public.issues;
CREATE TRIGGER on_issue_created AFTER INSERT ON public.issues FOR EACH ROW EXECUTE FUNCTION public.award_report_points();

DROP TRIGGER IF EXISTS on_vote_created ON public.issue_votes;
CREATE TRIGGER on_vote_created AFTER INSERT ON public.issue_votes FOR EACH ROW EXECUTE FUNCTION public.award_vote_points();
