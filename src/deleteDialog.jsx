import { useState, forwardRef, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grow, IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://fastapi-mionjoapi-alertemionjo1455-9k2qh0ff.leapcell.dev";

const STYLES = {
  iconButton: { color: '#000', '&:focus': { outline: 'none' }, '&.Mui-focusVisible': { outline: 'none' } },
  primaryButton: { backgroundColor: '#f9aa33', color: '#000', borderRadius: 2, px: 3, '&:hover': { backgroundColor: '#e89922' }, '&:disabled': { backgroundColor: '#f9aa3380', color: '#00000060' } },
  secondaryButton: { backgroundColor: '#e8f0f6', color: '#000', borderRadius: 2, px: 3, '&:hover': { backgroundColor: '#d0e0f0' } }
};

const Transition = forwardRef(function Transition(props, ref) {
  return <Grow ref={ref} {...props} />;
});

export default function DeleteDialog({ refreshRows, rowData }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState<number | null>(null);

  useEffect(() => {
    if (open && rowData) setId(rowData.id);
  }, [open, rowData]);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const extractFileName = (url) => {
    if (!url) return null;
    try {
      const segments = url.split('/');
      return decodeURIComponent(segments[segments.length - 1]);
    } catch {
      return null;
    }
  };

  const deleteFileWithPHP = async (fileUrl) => {
    if (!fileUrl) return { success: true, message: 'Aucun fichier à supprimer' };

    const fileName = extractFileName(fileUrl);
    if (!fileName) return { success: false, message: 'Nom de fichier invalide' };

    try {
      const formData = new FormData();
      formData.append('fileName', fileName);

      const response = await axios.post(`https://skyblue-gaur-819446.hostingersite.com1/file.php`, formData);
      return response.data; // doit renvoyer { success: boolean, message: string } depuis PHP
    } catch (error) {
      return { success: false, message: error.message || 'Erreur lors de la suppression du fichier' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!id) {
      toast.error("ID invalide");
      return;
    }

    setLoading(true);

    try {
      let fileResult = { success: true, message: 'Aucun fichier' };
      if (rowData?.fichierUrl) {
        fileResult = await deleteFileWithPHP(rowData.fichierUrl);
      }

      // Supprimer l'enregistrement en base
      await axios.get(`${API_BASE_URL}//supprimer_information/${id}`);

      toast.success(fileResult.success ? "Suppression complète réussie" : `DB supprimée mais fichier: ${fileResult.message}`);

      handleClose();
      if (refreshRows) await refreshRows();
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Supprimer">
        <IconButton size="small" onClick={handleClickOpen} sx={STYLES.iconButton} aria-label="Supprimer l'activité">
          <DeleteIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={handleClose}
        TransitionComponent={Transition}
        fullWidth
        maxWidth="sm"
        keepMounted={false}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{ sx: { borderRadius: 2 } }}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Supprimer cette ligne N° {rowData?.id}
        </DialogTitle>

        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            <strong>Activité:</strong> {rowData?.raison || 'Non spécifiée'}
          </DialogContentText>
          <DialogContentText variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 500 }}>
            ⚠️ <strong>Attention:</strong> Cette action est irréversible.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading} sx={STYLES.secondaryButton}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading} sx={STYLES.primaryButton}>{loading ? "Suppression..." : "Confirmer"}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
