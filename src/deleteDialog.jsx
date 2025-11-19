import { useState, forwardRef, useEffect } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, Grow, IconButton, Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = "https://api.mionjo.mg";
const API_BASE_URL_FILES = "https://skyblue-gaur-819446.hostingersite.com/file.php";

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
  const [id, setId] = useState(null);

  useEffect(() => {
    if (open && rowData) setId(rowData.id);
  }, [open, rowData]);

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const extractFileName = (url) => {
    if (!url || typeof url !== "string") return null;

    try {
      const cleanUrl = url.split('?')[0].split('#')[0];
      const sanitized = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
      const segments = sanitized.split('/');
      const fileName = segments.pop(); 
      
      console.log("URL complète:", url);
      console.log("Nom de fichier extrait:", fileName);
      
      return fileName || null;
    } catch (error) {
      console.error("Erreur extraction nom de fichier:", error);
      return null;
    }
  };

  const deleteFileWithPHP = async (fileUrl) => {
    if (!fileUrl) {
      console.log("Aucune URL de fichier fournie");
      return { success: true, message: 'Aucun fichier à supprimer' };
    }

    const fileName = extractFileName(fileUrl);
    
    if (!fileName) {
      console.error("Nom de fichier invalide extrait de:", fileUrl);
      return { success: false, message: 'Nom de fichier invalide' };
    }

    console.log("Tentative de suppression du fichier:", fileName);

    try {
      const formData = new FormData();
      formData.append('fileName', fileName);

      const response = await axios.post(
        API_BASE_URL_FILES,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log("Réponse du serveur:", response.data);
      return response.data;

    } catch (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message 
        || 'Erreur inconnue lors de la suppression du fichier';
      
      return { 
        success: false, 
        message: errorMessage 
      };
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
      
      // Suppression du fichier si présent
      if (rowData?.fichierUrl) {
        console.log("=== DÉBUT SUPPRESSION FICHIER ===");
        console.log("URL du fichier:", rowData.fichierUrl);
        
        fileResult = await deleteFileWithPHP(rowData.fichierUrl);
        
        console.log("Résultat suppression fichier:", fileResult);
        console.log("=== FIN SUPPRESSION FICHIER ===");
      } else {
        console.log("Aucun fichier à supprimer (fichierUrl vide)");
      }

      // Suppression de l'enregistrement en base
      console.log("Suppression de l'enregistrement en base, ID:", id);
      await axios.get(`${API_BASE_URL}/supprimer_information/${id}`);

      // Affichage du résultat
      if (fileResult.success) {
        toast.success("Suppression réussie");
      } else {
        toast.warning(`DB supprimée mais problème avec le fichier: ${fileResult.message}`);
      }

      handleClose();
      if (refreshRows) await refreshRows();
      
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error(
        error.response?.data?.error 
        || error.response?.data?.message
        || error.message 
        || "Erreur lors de la suppression"
      );
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
          {rowData?.fichierUrl && (
            <DialogContentText variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
              <strong>Fichier:</strong> {extractFileName(rowData.fichierUrl) || 'N/A'}
            </DialogContentText>
          )}
          <DialogContentText variant="body2" color="warning.main" sx={{ mt: 2, fontWeight: 500 }}>
            ⚠️ <strong>Attention:</strong> Cette action est irréversible.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} disabled={loading} sx={STYLES.secondaryButton}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} sx={STYLES.primaryButton}>
            {loading ? "Suppression..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}